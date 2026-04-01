export interface Logger {
    debug(obj: object, msg: string): void;
    debug(msg: string): void;
    warn(obj: object, msg: string): void;
    warn(msg: string): void;
}
