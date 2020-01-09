import { PaypalButtonStyleOptions } from '../../../payment/strategies/paypal-commerce';

/**
 * @internal
 */
export interface PaypalCommerceButtonInitializeOptions {
    /**
     * A set of styling options for the checkout button.
     */
    style?: PaypalButtonStyleOptions;
}
