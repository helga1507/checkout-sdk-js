import { Overlay, OverlayShowOptions } from '../../../common/overlay';

export const idOverlay = 'paypal-commerce-overlay';

export default class OverlayPaypal extends Overlay {

    constructor() {
        super({ id: idOverlay });
    }

    show(options?: OverlayShowOptions) {
        super.show(options);
        const element = document.getElementById(idOverlay);

        if (element) {
            const modal = document.createElement('div');
            const text = document.createElement('div');
            const link = document.createElement('a');

            modal.className = 'paypal-commerce-overlay_modal';
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.color = 'white';
            modal.style.maxWidth = '330px';
            modal.style.fontSize = '1.3em';

            text.className = 'paypal-commerce-overlay_text';
            text.innerText = 'Don\'t see the secure PayPal browser? We\'ll help you re-launch the window to complete your flow. You might need to enable pop-ups in your browser in order to continue.';

            link.className = 'paypal-commerce-overlay_link';
            link.innerText = 'Continue';
            link.style.marginTop = '15px';

            modal.appendChild(text);
            modal.appendChild(link);

            element.appendChild(modal);
        }
    }
}
