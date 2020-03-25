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
            element.parentElement!.removeChild(element);
        }
    });

    it('shows modal element with styles', () => {
        overlay.show();

        const modal: HTMLElement | null = document.querySelector(`#${idOverlay} .paypal-commerce-overlay_modal`);

        expect(modal).toBeTruthy();
        expect(modal!.style.position).toEqual('fixed');
        expect(modal!.style.top).toEqual('50%');
        expect(modal!.style.left).toEqual('50%');
        expect(modal!.style.transform).toEqual('translate(-50%, -50%)');
        expect(modal!.style.color).toEqual('white');
        expect(modal!.style.maxWidth).toEqual('330px');
        expect(modal!.style.fontSize).toEqual('1.3em');

    });

    it('shows text element with styles', () => {
        overlay.show();

        const text: HTMLElement | null = document.querySelector(`#${idOverlay} .paypal-commerce-overlay_text`);

        expect(text).toBeTruthy();
        expect(text!.innerText).toBeTruthy();
    });

    it('shows link element with styles', () => {
        overlay.show();

        const link: HTMLElement | null = document.querySelector(`#${idOverlay} .paypal-commerce-overlay_link`);

        expect(link).toBeTruthy();
        expect(link!.innerText).toBeTruthy();
        expect(link!.style.marginTop).toEqual('15px');
    });
});
// tslint:enable:no-non-null-assertion
