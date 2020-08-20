import zoid from 'zoid';

import { MissingDataError, MissingDataErrorType } from '../../../common/error/errors';
import { Overlay } from '../../../common/overlay';

const modalWidth = '450px';
const modalHeight = '600px';

export interface ProcessorOptions {
    overlay?: {
        helpText?: string;
        continueText?: string;
    };
}

// interface CheckoutPropsType {
//     createOrder(): string;
// }

export default class PaypalCommercePaymentProcessor {
    private _window = window;
    private _popup?: any;
    private _overlay?: Overlay;

    constructor() {}

    initialize({ overlay }: ProcessorOptions) {
        this._overlay = new Overlay({ hasCloseButton: true, innerHtml: this._getOverlayElements(overlay) });
    }

    paymentPayPal(approveUrl: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // const paramsWindow =  this._getParamsWindow();

            const closeWindow = (isResolve: boolean, isRemoveOverlay: boolean = true) => {
                this._window.removeEventListener('message', messageHandler);

                if (this._popup) {
                    // this._popup.close();
                    this._popup = undefined;
                }

                if (isRemoveOverlay && this._overlay) {
                    this._overlay.remove();
                }

                isResolve
                    ? resolve(true)
                    : reject(new MissingDataError(MissingDataErrorType.MissingPayment));
            };

            const messageHandler = (event: MessageEvent) => {
                if (event.origin !== 'https://www.sandbox.paypal.com' && event.origin !== 'https://www.paypal.com') {
                    return;
                }

                const data = JSON.parse(event.data);

                if (data.operation === 'return_to_merchant' && data.updateParent) {
                    this._window.removeEventListener('message', messageHandler);
                    closeWindow(true);
                }
            };

            this._window.addEventListener('message', messageHandler);
            this._popup = zoid.create({
                defaultContext: 'popup',
                tag: 'paypal-checkout',
                domain: /\.paypal\.com(:\d+)?$/,
                url: approveUrl,
                dimensions: { width: modalWidth, height: modalHeight },
                props: {
                    onApprove: {
                        type: 'function',
                        alias: 'onAuthorize',
                        value: () => {
                            console.warn('onAuthorize!!');
                        },
                    },
                },
                containerTemplate: ({ close, focus, frame, prerenderFrame }) => {
                    const element = document.createElement('div');
                    element.id = 'checkoutOverlayContainer';
                    const closeElement = document.createElement('div');
                    closeElement.innerText = 'Close';
                    closeElement.addEventListener('click', close);
                    element.style.background = 'rgba(0, 0, 0, 0.8)';
                    element.style.position = 'absolute';
                    element.style.width = '100%';
                    element.style.height = '100%';
                    element.style.zIndex = '100%';
                    const inner = document.createElement('div');
                    inner.addEventListener('click', focus);
                    const innerText = this._getOverlayElements();

                    inner.appendChild(innerText);
                    element.appendChild(inner);
                    element.appendChild(closeElement);

                    if (frame) {
                        element.appendChild(frame);
                    }
                    if (prerenderFrame) {
                        element.appendChild(prerenderFrame);
                    }

                    return element;
                },
            })({
                onAuthorize: () => {
                    console.log('onAuthorizeonAuthorizeonAuthorizeonAuthorize');
                },
                onApprove: () => {
                    console.log('onApproveonApproveonApprove');
                },
            });
            console.log('this._popup', this._popup);

            this._popup.render();
            // this._popup.renderTo(window.parent, {
            //     onApprove: () => {
            //         console.log('onAuthorizeonAuthorizeonAuthorizeonAuthorize');
            //     },
            // });
            console.log('this._popup', this._popup);
            // this._popup = this._window.open(approveUrl, 'PPFrame', paramsWindow);

            // const popupTick = setInterval(() => {
            //     if (!this._popup || this._popup.closed) {
            //         clearInterval(popupTick);
            //
            //         closeWindow(false);
            //     }
            // }, 500);

            if (this._overlay) {
                this._overlay.show({
                    onClick: () => this._popup && this._popup.focus(),
                    onClickClose: () => closeWindow(false),
                });
            }
        });
    }

    deinitialize(): void {
        this._overlay = undefined;
    }

    private _getOverlayElements(options: ProcessorOptions['overlay'] = {}): DocumentFragment {
        const fragment = document.createDocumentFragment();
        const helpText = document.createElement('div');
        const continueText = document.createElement('strong');

        helpText.className = 'paypal-commerce-overlay_text';
        helpText.innerText = options.helpText || 'Don\'t see the secure PayPal browser? We\'ll help you re-launch the window to complete your flow. You might need to enable pop-ups in your browser in order to continue.';

        continueText.className = 'paypal-commerce-overlay_link';
        continueText.innerText = options.continueText || 'Click to continue';
        continueText.style.marginTop = '15px';
        continueText.style.display = 'block';
        continueText.style.color = 'white';
        continueText.style.textDecoration = 'underline';

        fragment.appendChild(helpText);
        fragment.appendChild(continueText);

        return fragment;
    }

    // private _getParamsWindow(): string {
    //     return `
    //         left=${Math.round((window.screen.height - modalWidth) / 2)},
    //         top=${Math.round((window.screen.width - modalHeight) / 2)},
    //         height=${modalHeight},width=${modalWidth},status=yes,toolbar=no,menubar=no,resizable=yes,scrollbars=no
    //     `;
    // }
}
