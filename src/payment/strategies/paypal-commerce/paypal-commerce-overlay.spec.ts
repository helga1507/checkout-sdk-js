import OverlayPaypal, { idOverlay } from './paypal-commerce-overlay';

// tslint:disable:no-non-null-assertion
describe('OverlayPaypal', () => {
    let overlay: OverlayPaypal;

    beforeEach(() => {
        overlay = new OverlayPaypal();
    });

    afterEach(() => {
        const element = document.getElementById(idOverlay);

        if (element) {
            element.remove();
        }
    });

    it('shows modal element', () => {
        overlay.show();

        const modal: HTMLElement | null = document.querySelector(`#${idOverlay} .paypal-commerce-overlay_modal`);

        expect(modal).toBeTruthy();
    });

    it('shows text element', () => {
        overlay.show();

        const text: HTMLElement | null = document.querySelector(`#${idOverlay} .paypal-commerce-overlay_text`);

        expect(text).toBeTruthy();
        expect(text!.innerText).toBe('Don\'t see the secure PayPal browser? We\'ll help you re-launch the window to complete your flow. You might need to enable pop-ups in your browser in order to continue.');
    });

    it('shows link element', () => {
        overlay.show();

        const link: HTMLElement | null = document.querySelector(`#${idOverlay} .paypal-commerce-overlay_link`);

        expect(link).toBeTruthy();
        expect(link!.innerText).toBe('Continue');
        expect(link!.hasAttribute('href')).toBe(false);
    });
});
// tslint:enable:no-non-null-assertion
