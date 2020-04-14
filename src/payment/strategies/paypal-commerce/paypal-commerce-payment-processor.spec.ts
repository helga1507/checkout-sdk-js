import { MissingDataError, MissingDataErrorType } from '../../../common/error/errors';

import { OverlayPaypal, PaypalCommercePaymentProcessor } from './index';

// tslint:disable:no-non-null-assertion
describe('PaypalCommercePaymentProcessor', () => {
    let paypalCommercePaymentProcessor: PaypalCommercePaymentProcessor;
    let overlay: OverlayPaypal;
    const focus = jest.fn();
    const close = jest.fn();

    beforeEach(() => {
        window.open = jest.fn();

        overlay = new OverlayPaypal();
        paypalCommercePaymentProcessor = new PaypalCommercePaymentProcessor(overlay);
    });

    it('call window.open', async () => {
        try {
            await paypalCommercePaymentProcessor.paymentPayPal('approveUrl');
        } catch (error) {
            expect(window.open).toHaveBeenCalled();
        }
    });

    it('throw error when window closed', async () => {
        try {
            await paypalCommercePaymentProcessor.paymentPayPal('approveUrl');
        } catch (error) {
            expect(error).toEqual(new MissingDataError(MissingDataErrorType.MissingPayment));
        }
    });

    it('check event listener on message', async () => {
        window.open = jest.fn(() => ({ focus, close }));
        const map: {[key: string]: any}  = {};

        window.addEventListener = jest.fn((event, cb) => {
            if (event === 'message') {
                setTimeout(() => {
                    cb({
                        origin: 'sandbox.paypal.com',
                        data: JSON.stringify({ operation: 'return_to_merchant', updateParent: true }),
                    });
                });
            }

            map[event] = cb;
        });

        const res = await paypalCommercePaymentProcessor.paymentPayPal('approveUrl');

        expect(res).toEqual(true);
    });
});
// tslint:enable:no-non-null-assertion
