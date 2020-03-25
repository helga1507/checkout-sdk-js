import { MissingDataError, MissingDataErrorType } from '../../../common/error/errors';

import { OverlayPaypal } from './index';

export default class PaypalCommercePaymentProcessor {
    private _window = window;
    private _popup?: Window | null;

    constructor(
        private _overlay: OverlayPaypal
    ) {}

    paymentPayPal(approveUrl: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const closeWindow = (isResolve: boolean) => {
                this._overlay.remove();

                if (this._popup) {
                    this._popup.close();
                }

                isResolve
                    ? resolve(true)
                    : reject(new MissingDataError(MissingDataErrorType.MissingPayment));
            };

            const handlerMessage = (event: MessageEvent) => {
                if (event.origin.includes('sandbox.paypal.com')) {
                    const data = JSON.parse(event.data);

                    if (data.operation === 'return_to_merchant' && data.updateParent) {
                        this._window.removeEventListener('message', handlerMessage);
                        closeWindow(true);
                    }
                }
            };

            this._window.addEventListener('message', handlerMessage);

            const params = `
                left=${Math.round((window.screen.height - 450) / 2)},
                top=${Math.round((window.screen.width - 600) / 2)},
                height=600,width=450,status=yes,toolbar=no,menubar=no,resizable=yes,scrollbars=no
            `;
            this._popup = this._window.open(approveUrl, 'PPFrame', params);

            const popupTick = setInterval(() => {
                if (!this._popup || this._popup.closed) {
                    clearInterval(popupTick);

                    closeWindow(false);
                }
            }, 500);

            this._overlay.show({
                onClick: () => {
                    this._popup
                        ? this._popup.focus()
                        : closeWindow(false);
                },
            });
        });
    }
}
