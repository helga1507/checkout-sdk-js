import { createAction, Action } from '@bigcommerce/data-store';
import { createRequestSender, RequestSender } from '@bigcommerce/request-sender';
import { getScriptLoader } from '@bigcommerce/script-loader';
import { EventEmitter } from 'events';
import { omit } from 'lodash';
import { of, Observable } from 'rxjs';

import { Cart } from '../../../cart';
import { getCart } from '../../../cart/carts.mock';
import { createCheckoutStore, CheckoutStore } from '../../../checkout';
import { getCheckoutStoreState } from '../../../checkout/checkouts.mock';
import { InvalidArgumentError } from '../../../common/error/errors';
import { OrderActionCreator, OrderActionType, OrderRequestBody } from '../../../order';
import { getOrderRequestBody } from '../../../order/internal-orders.mock';
import { PaymentArgumentInvalidError, PaymentMethodInvalidError } from '../../errors';
import PaymentActionCreator from '../../payment-action-creator';
import { PaymentActionType } from '../../payment-actions';
import PaymentMethod from '../../payment-method';
import { getPaypalCommerce } from '../../payment-methods.mock';
import { PaymentInitializeOptions } from '../../payment-request-options';
import PaymentStrategy from '../payment-strategy';

import { ButtonsOptions, PaymentStrategyTypes, PaypalCommercePaymentInitializeOptions, PaypalCommercePaymentProcessor, PaypalCommercePaymentStrategy, PaypalCommerceRequestSender, PaypalCommerceScriptLoader } from './index';
import { OptionalParamsRenderButtons } from './paypal-commerce-payment-processor';

describe('PaypalCommercePaymentStrategy', () => {
    let orderActionCreator: OrderActionCreator;
    let paymentActionCreator: PaymentActionCreator;
    let paypalCommercePaymentStrategy: PaymentStrategy;
    let paymentMethod: PaymentMethod;
    let store: CheckoutStore;
    let submitOrderAction: Observable<Action>;
    let submitPaymentAction: Observable<Action>;
    let options: PaymentInitializeOptions;
    let requestSender: RequestSender;
    let paypalCommercePaymentProcessor: PaypalCommercePaymentProcessor;
    let paypalcommerceOptions: PaypalCommercePaymentInitializeOptions;
    let eventEmitter: EventEmitter;
    let cart: Cart;
    let orderID: string;
    let submitForm: () => void;

    beforeEach(() => {
        paymentMethod = { ...getPaypalCommerce() };
        cart = { ...getCart() };
        submitOrderAction = of(createAction(OrderActionType.SubmitOrderRequested));
        submitPaymentAction = of(createAction(PaymentActionType.SubmitPaymentRequested));
        requestSender = createRequestSender();
        paypalCommercePaymentProcessor = new PaypalCommercePaymentProcessor(new PaypalCommerceScriptLoader(getScriptLoader()), new PaypalCommerceRequestSender(requestSender));
        eventEmitter = new EventEmitter();

        store = createCheckoutStore(getCheckoutStoreState());
        submitForm = jest.fn();

        paypalcommerceOptions = {
            container: '#container',
            style: {},
            submitForm,
            onRenderButton: jest.fn(),
            onValidate: jest.fn(),
        };

        options = {
            methodId: paymentMethod.id,
            paypalcommerce: paypalcommerceOptions,
        };

        orderID = 'ORDER_ID';

        jest.spyOn(store, 'dispatch');

        orderActionCreator = {} as OrderActionCreator;
        orderActionCreator.submitOrder = jest.fn(() => submitOrderAction);

        paymentActionCreator = {} as PaymentActionCreator;
        paymentActionCreator.submitPayment = jest.fn(() => submitPaymentAction);

        jest.spyOn(paypalCommercePaymentProcessor, 'initialize')
            .mockReturnValue(Promise.resolve());

        jest.spyOn(paypalCommercePaymentProcessor, 'renderButtons')
            .mockImplementation((...arg) => {
                const [, , options] = arg;

                eventEmitter.on('onApprove', () => {
                    if (options.onApprove) {
                        options.onApprove({ orderID });
                    }
                });
            });

        paypalCommercePaymentStrategy = new PaypalCommercePaymentStrategy(
            store,
            orderActionCreator,
            paymentActionCreator,
            paypalCommercePaymentProcessor
        );
    });

    describe('#initialize()', () => {
        beforeEach(() => {
            jest.spyOn(store.getState().paymentMethods, 'getPaymentMethodOrThrow')
                .mockReturnValue({ ...getPaypalCommerce(), initializationData: { ...getPaypalCommerce().initializationData, orderId: undefined } });
        });

        it('returns checkout state', async () => {
            const output = await paypalCommercePaymentStrategy.initialize(options);

            expect(output).toEqual(store.getState());
        });

        it('not initialize paypalCommercePaymentProcessor if orderId is not undefined', async () => {
            jest.spyOn(store.getState().paymentMethods, 'getPaymentMethodOrThrow')
                .mockReturnValue({ ...getPaypalCommerce() });

            await paypalCommercePaymentStrategy.initialize(options);

            expect(paypalCommercePaymentProcessor.initialize).not.toHaveBeenCalled();
        });

        it('initialize paypalCommercePaymentProcessor if orderId is undefined', async () => {
            await paypalCommercePaymentStrategy.initialize(options);

            const obj = {
                    'client-id': 'abc',
                    commit: true,
                    currency: 'USD',
                    intent: 'capture',
                };

            expect(paypalCommercePaymentProcessor.initialize).toHaveBeenCalledWith(obj);
        });

        it('render PayPal button if orderId is undefined', async () => {
            await paypalCommercePaymentStrategy.initialize(options);

            const buttonOption = {
                onApprove: expect.any(Function),
                onClick: expect.any(Function),
                style: paypalcommerceOptions.style,
            };

            const optionalParams = { fundingKey: 'PAYPAL', paramsForProvider: { isCheckout: true }, onRenderButton: expect.any(Function) };

            expect(paypalCommercePaymentProcessor.renderButtons).toHaveBeenCalledWith(cart.id, `${paypalcommerceOptions.container}`, buttonOption, optionalParams);
        });

        it('render Credit PayPal button if orderId is undefined', async () => {
            paypalCommercePaymentStrategy = new PaypalCommercePaymentStrategy(
                store,
                orderActionCreator,
                paymentActionCreator,
                paypalCommercePaymentProcessor,
                PaymentStrategyTypes.credit
            );

            await paypalCommercePaymentStrategy.initialize(options);

            const buttonOption = {
                onApprove: expect.any(Function),
                onClick: expect.any(Function),
                style: paypalcommerceOptions.style,
            };

            const optionalParams = { fundingKey: 'PAYLATER', paramsForProvider: { isCheckout: true }, onRenderButton: expect.any(Function) };

            expect(paypalCommercePaymentProcessor.renderButtons).toHaveBeenCalledWith(cart.id, `${paypalcommerceOptions.container}`, buttonOption, optionalParams);
        });

        it('call submitForm after approve', async () => {
            await paypalCommercePaymentStrategy.initialize(options);

            eventEmitter.emit('onApprove');

            await new Promise(resolve => process.nextTick(resolve));

            expect(submitForm).toHaveBeenCalled();
        });

        it('throw error if paypalcommerce is undefined', async () => {
            const expectedError = new InvalidArgumentError('Unable to initialize payment because "options.paypalcommerce" argument is not provided.');

            try {
                await paypalCommercePaymentStrategy.initialize({ ...options, paypalcommerce: undefined });
            } catch (error) {
                expect(error).toEqual(expectedError);
            }
        });

        describe('render Alternative Payment Button', () => {
            const gatewayId = 'paypalcommercealternativemethods';
            let optionalParams: OptionalParamsRenderButtons;
            let buttonOption: ButtonsOptions;

            beforeEach(() => {
                buttonOption = {
                    onApprove: expect.any(Function),
                    onClick: expect.any(Function),
                    style: paypalcommerceOptions.style,
                };
                optionalParams = { paramsForProvider: { isCheckout: true }, onRenderButton: expect.any(Function) };

                paypalCommercePaymentStrategy = new PaypalCommercePaymentStrategy(
                    store,
                    orderActionCreator,
                    paymentActionCreator,
                    paypalCommercePaymentProcessor,
                    PaymentStrategyTypes.alternative
                );
            });

            it('Przelewy24', async () => {
                optionalParams.fundingKey = 'P24';

                await paypalCommercePaymentStrategy.initialize({ ...options, gatewayId, methodId: 'przelewy24' });

                expect(paypalCommercePaymentProcessor.renderButtons).toHaveBeenCalledWith(cart.id, `${paypalcommerceOptions.container}`, buttonOption, optionalParams);
            });

            it('Bancontact', async () => {
                optionalParams.fundingKey = 'BANCONTACT';

                await paypalCommercePaymentStrategy.initialize({ ...options, gatewayId, methodId: 'bancontact' });

                expect(paypalCommercePaymentProcessor.renderButtons).toHaveBeenCalledWith(cart.id, `${paypalcommerceOptions.container}`, buttonOption, optionalParams);
            });

            it('giropay', async () => {
                optionalParams.fundingKey = 'GIROPAY';

                await paypalCommercePaymentStrategy.initialize({ ...options, gatewayId, methodId: 'giropay' });

                expect(paypalCommercePaymentProcessor.renderButtons).toHaveBeenCalledWith(cart.id, `${paypalcommerceOptions.container}`, buttonOption, optionalParams);
            });

            it('eps', async () => {
                optionalParams.fundingKey = 'EPS';

                await paypalCommercePaymentStrategy.initialize({ ...options, gatewayId, methodId: 'eps' });

                expect(paypalCommercePaymentProcessor.renderButtons).toHaveBeenCalledWith(cart.id, `${paypalcommerceOptions.container}`, buttonOption, optionalParams);
            });

            it('IDEAL', async () => {
                optionalParams.fundingKey = 'IDEAL';

                await paypalCommercePaymentStrategy.initialize({ ...options, gatewayId, methodId: 'ideal' });

                expect(paypalCommercePaymentProcessor.renderButtons).toHaveBeenCalledWith(cart.id, `${paypalcommerceOptions.container}`, buttonOption, optionalParams);
            });

            it('MyBank', async () => {
                optionalParams.fundingKey = 'MYBANK';

                await paypalCommercePaymentStrategy.initialize({ ...options, gatewayId, methodId: 'mybank' });

                expect(paypalCommercePaymentProcessor.renderButtons).toHaveBeenCalledWith(cart.id, `${paypalcommerceOptions.container}`, buttonOption, optionalParams);
            });

            it('Sofort', async () => {
                optionalParams.fundingKey = 'SOFORT';

                await paypalCommercePaymentStrategy.initialize({ ...options, gatewayId, methodId: 'sofort' });

                expect(paypalCommercePaymentProcessor.renderButtons).toHaveBeenCalledWith(cart.id, `${paypalcommerceOptions.container}`, buttonOption, optionalParams);
            });
        });
    });

    describe('#execute()', () => {
        let orderRequestBody: OrderRequestBody;

        beforeEach(() => {
            orderRequestBody = getOrderRequestBody();
        });

        it('pass the options to submitOrder', async () => {
            await paypalCommercePaymentStrategy.initialize(options);
            await paypalCommercePaymentStrategy.execute(orderRequestBody, options);

            expect(orderActionCreator.submitOrder).toHaveBeenCalledWith(omit(orderRequestBody, 'payment'), options);
        });

        it('calls submit order', async () => {
            await paypalCommercePaymentStrategy.initialize(options);
            await paypalCommercePaymentStrategy.execute(orderRequestBody, options);

            expect(store.dispatch).toHaveBeenCalledWith(submitOrderAction);
        });

        it('submitPayment with the right information', async () => {
            const expected = {
                ...orderRequestBody.payment,
                paymentData: {
                    formattedPayload: {
                        vault_payment_instrument: null,
                        set_as_default_stored_instrument: null,
                        device_info: null,
                        paypal_account: {
                            order_id: paymentMethod.initializationData.orderId,
                        },
                    },
                },
            };

            await paypalCommercePaymentStrategy.initialize(options);
            await paypalCommercePaymentStrategy.execute(orderRequestBody, options);

            expect(paymentActionCreator.submitPayment).toHaveBeenCalledWith(expected);
        });

        it('calls submit payment', async () => {
            await paypalCommercePaymentStrategy.initialize(options);
            await paypalCommercePaymentStrategy.execute(orderRequestBody, options);

            expect(store.dispatch).toHaveBeenCalledWith(submitPaymentAction);
        });

        it('throw error without payment data', async () => {
            orderRequestBody.payment = undefined;

            await paypalCommercePaymentStrategy.initialize(options);

            try {
                await paypalCommercePaymentStrategy.execute(orderRequestBody, options);
            } catch (error) {
                expect(error).toEqual(new PaymentArgumentInvalidError(['payment']));
            }
        });

        it('throw error without orderId', async () => {
            orderID = '';

            try {
                await paypalCommercePaymentStrategy.execute(orderRequestBody, options);
            } catch (error) {
                expect(error).toEqual(new PaymentMethodInvalidError());
            }
        });
    });
});
