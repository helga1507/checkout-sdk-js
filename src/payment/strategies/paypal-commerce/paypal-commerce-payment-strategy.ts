// import { createAction } from '@bigcommerce/data-store';
import { Subject } from 'rxjs';

import { Cart } from '../../../cart';
import { CheckoutStore, InternalCheckoutSelectors } from '../../../checkout';
import { NotInitializedError, NotInitializedErrorType } from '../../../common/error/errors';
import { OrderActionCreator, OrderRequestBody } from '../../../order';
import { OrderFinalizationNotRequiredError } from '../../../order/errors';
import { PaymentArgumentInvalidError } from '../../errors';
import PaymentActionCreator from '../../payment-action-creator';
import PaymentMethodActionCreator from '../../payment-method-action-creator';
import { PaymentInitializeOptions, PaymentRequestOptions } from '../../payment-request-options';
import { PaymentStrategyActionType } from '../../payment-strategy-actions';
import PaymentStrategy from '../payment-strategy';

import { ButtonsOptions, PaypalCommerceInitializationData, PaypalCommercePaymentProcessor, PaypalCommerceRequestSender, PaypalCommerceScriptOptions } from './index';
import PaypalCommerceScriptLoader from './paypal-commerce-script-loader';

export default class PaypalCommercePaymentStrategy implements PaymentStrategy {
    private _paymentEvent$: Subject<{ type: PaymentStrategyActionType }>;

    constructor(
        private _store: CheckoutStore,
        private _orderActionCreator: OrderActionCreator,
        private _paymentActionCreator: PaymentActionCreator,
        private _paypalCommerceRequestSender: PaypalCommerceRequestSender,
        private _paypalCommercePaymentProcessor: PaypalCommercePaymentProcessor,
        private _paypalScriptLoader: PaypalCommerceScriptLoader,
        private _paymentMethodActionCreator: PaymentMethodActionCreator
    ) {
        this._paymentEvent$ = new Subject();
    }

    async initialize(options: PaymentInitializeOptions): Promise<InternalCheckoutSelectors> {
        const { methodId } = options;
        const state = await this._store.dispatch(this._paymentMethodActionCreator.loadPaymentMethod(methodId));
        const { initializationData } = state.paymentMethods.getPaymentMethodOrThrow(methodId);

        if (!options.paypalcommerce?.container) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        const cart = state.cart.getCartOrThrow();

        const paramsScript = { options: this._getOptionsScript(initializationData, cart) };
        const paypal = await this._paypalScriptLoader.loadPaypalCommerce(paramsScript, true);

        const buttonParams: ButtonsOptions = {
            fundingSource: paypal.FUNDING.PAYPAL,
            onClick: () => {},
            createOrder: () => this._setupPayment(cart.id, methodId),
            onApprove: () => {
                this._paymentEvent$.next({ type: PaymentStrategyActionType.ApproveAccountFinished });
            },
        };

        paypal.Buttons(buttonParams).render(options.paypalcommerce.container);

        this._paymentEvent$.next({ type: PaymentStrategyActionType.ApproveAccountStarted });
        // pipe(of(createAction(PaymentStrategyActionType.ApproveAccountStarted)));

        return Promise.resolve(this._store.getState());
    }

    async execute(payload: OrderRequestBody, options: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        const { payment, ...order } = payload;
        const { methodId } = options;
        const state = this._store.getState();
        const { initializationData: { orderId }} = state.paymentMethods.getPaymentMethodOrThrow(methodId);

        if (!payment) {
            throw new PaymentArgumentInvalidError(['payment']);
        }

        const paymentData =  {
            formattedPayload: {
                vault_payment_instrument: null,
                set_as_default_stored_instrument: null,
                device_info: null,
                paypal_account: {
                    order_id: orderId,
                },
            },
        };

        await this._store.dispatch(this._orderActionCreator.submitOrder(order, options));

        return this._store.dispatch(this._paymentActionCreator.submitPayment({ ...payment, paymentData }));
    }

    finalize(): Promise<InternalCheckoutSelectors> {
        return Promise.reject(new OrderFinalizationNotRequiredError());
    }

    deinitialize(): Promise<InternalCheckoutSelectors> {
        this._paypalCommercePaymentProcessor.deinitialize();

        return Promise.resolve(this._store.getState());
    }

    private async _setupPayment(cartId: string, methodId: string): Promise<string> {
        const provider = methodId === 'paypalcommercecredit' ? 'paypalcommercecreditcheckout' : 'paypalcommercecheckout';
        const { orderId } = await this._paypalCommerceRequestSender.setupPayment(provider, cartId);

        return orderId;
    }

    private _getOptionsScript(initializationData: PaypalCommerceInitializationData, cart: Cart): PaypalCommerceScriptOptions {
        // TODO rebuild initialisation according to initialisation of each particular payment method
        const { clientId, intent, merchantId } = initializationData;

        return {
            clientId,
            merchantId,
            commit: false,
            currency: cart.currency.code,
            intent,
        };
    }
}
