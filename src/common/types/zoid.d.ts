declare class ZalgoPromise<R extends any> {
    constructor(handler: (resolve: (result: R) => void, reject: (error: unknown) => void) => void | null | undefined);
}

declare module 'zoid' {
    import 'zoid';

    interface CrossDomainWindowType {
        location: string;
        self: CrossDomainWindowType;
        closed: boolean;
        top: CrossDomainWindowType;
        frames: CrossDomainWindowType[];
        opener?: CrossDomainWindowType;
        parent: CrossDomainWindowType;
        length: number;
        postMessage(arg0: string, arg1: string): void;
        open(arg0: string, arg1: string, arg2: string): CrossDomainWindowType;
        close(): void;
        focus(): void;
    }

    export type EventHandlerType<T> = (arg0: T) => void | ZalgoPromise<void>;

    export type timeoutPropType = number;
    export type windowPropType = CrossDomainWindowType;
    export type cspNoncePropType = string;
    export type closePropType = () => ZalgoPromise<void>;
    export type focusPropType = () => ZalgoPromise<void>;
    export type showPropType = () => ZalgoPromise<void>;
    export type hidePropType = () => ZalgoPromise<void>;
    export type resizePropType = (arg0: {
        width: number | null | undefined;
        height: number | null | undefined;
    }) => ZalgoPromise<void>;
    export type getParentPropType = () => CrossDomainWindowType;
    export type getParentDomainPropType = () => string;

    export type onDisplayPropType = EventHandlerType<void>;
    export type onRenderedPropType = EventHandlerType<void>;
    export type onRenderPropType = EventHandlerType<void>;
    export type onClosePropType = EventHandlerType<void>;
    export type onDestroyPropType = EventHandlerType<void>;
    export type onResizePropType = EventHandlerType<void>;
    export type onFocusPropType = EventHandlerType<void>;
    export type onErrorPropType = EventHandlerType<unknown>;
    export type onPropsPropType<P> = (arg0: (arg0: PropsType<P>) => void) => void;

    type StringMatcherType = string | ReadonlyArray<string>;

    export type PropsType<P> = {
        timeout?: timeoutPropType;
        window?: windowPropType | null | undefined;
        close?: closePropType | null | undefined;
        focus?: focusPropType | null | undefined;
        resize?: resizePropType | null | undefined;
        cspNonce?: cspNoncePropType | null | undefined;
        onDisplay: onDisplayPropType;
        onRendered: onRenderedPropType;
        onRender: onRenderPropType;
        onClose: onClosePropType;
        onDestroy: onDestroyPropType;
        onResize: onResizePropType;
        onFocus: onFocusPropType;
        onError: onErrorPropType;
        onProps: onPropsPropType<P>;
    } & P;

    interface CssDimensionsType {
        width: string;
        height: string;
    }

    interface ZoidComponent<P> {
        (props?: any): ZoidComponentInstance<P>;
        isChild(): boolean;
    }

    interface ZoidComponentInstance<P> {
        event: EventEmitterType;
        state: object;
        render(): ZalgoPromise<void>;
        close(): ZalgoPromise<void>;
        focus(): ZalgoPromise<void>,
        resize(opt: { width?: number; height?: number }): ZalgoPromise<void>;
        onError(opt: any): ZalgoPromise<void>;
        updateProps(props: PropsInputType<P>): ZalgoPromise<void>;
        show(): ZalgoPromise<void>;
        hide(): ZalgoPromise<void>;
    }

    interface ComponentOptionsType<P> {
        tag: string;
        url: string | ({props: PropsType<P>});
        domain?: string | RegExp;
        bridgeUrl?: string;
        autoResize?: { width?: boolean; height?: boolean; element?: string };
        allowedParentDomains?: StringMatcherType;
        defaultContext?: 'popup' | 'iframe';
        dimensions?: CssDimensionsType;
        attributes?: {
            iframe?: { [key: string]: string };
            popup?: { [key: string]: string };
        };
        props?: { [key: string]: any };
        containerTemplate?(options: any): HTMLElement;
        // prerenderTemplate?(options: RenderOptionsType<P>): HTMLElement;
        // eligible?(agr0: {props: PropsInputType<P>}): ({ eligible: boolean; reason?: string });
        // validate?(agr0: {props: PropsInputType<P>}): void;
    }

    function create<P>(obj: ComponentOptionsType<P>): ZoidComponent<P>;

    export { create, ZoidComponent, ZoidComponentInstance };
}
