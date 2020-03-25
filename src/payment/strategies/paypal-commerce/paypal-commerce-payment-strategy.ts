import { CheckoutStore, InternalCheckoutSelectors } from '../../../checkout';
import { MissingDataError, MissingDataErrorType, NotInitializedError, NotInitializedErrorType } from '../../../common/error/errors';
import { OrderActionCreator, OrderRequestBody } from '../../../order';
import { OrderFinalizationNotRequiredError } from '../../../order/errors';
import { PaymentArgumentInvalidError } from '../../errors';
import PaymentActionCreator from '../../payment-action-creator';
import { PaymentRequestOptions } from '../../payment-request-options';
import PaymentStrategy from '../payment-strategy';

import { PaypalCommercePaymentProcessor, PaypalCommerceRequestSender } from './index';

export default class PaypalCommercePaymentStrategy implements PaymentStrategy {

    constructor(
        private _store: CheckoutStore,
        private _orderActionCreator: OrderActionCreator,
        private _paymentActionCreator: PaymentActionCreator,
        private _paypalCommerceRequestSender: PaypalCommerceRequestSender,
        private _paypalCommercePaymentProcessor: PaypalCommercePaymentProcessor
    ) {}

    async initialize(): Promise<InternalCheckoutSelectors> {
        return Promise.resolve(this._store.getState());
    }

    async execute(payload: OrderRequestBody, options: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        const { payment, ...order } = payload;
        const state = this._store.getState();
        const paymentMethod = state.paymentMethods.getPaymentMethod(options.methodId);

        if (!payment) {
            throw new PaymentArgumentInvalidError(['payment']);
        }

        if (!paymentMethod) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        let { orderId } = paymentMethod.initializationData;

        if (!orderId) {
            const cart = state.cart.getCart();

            if (!cart) {
                throw new MissingDataError(MissingDataErrorType.MissingCart);
            }
            const { approveUrl, orderId: createdOrderID } = await this._paypalCommerceRequestSender.setupPayment(cart.id);

            await this._paypalCommercePaymentProcessor.paymentPayPal(approveUrl);

            orderId = createdOrderID;
        }

        const paymentData =  {
            formattedPayload: {
                vault_payment_instrument: null,
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
        return Promise.resolve(this._store.getState());
    }
}
