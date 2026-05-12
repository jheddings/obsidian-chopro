export class Logger {
    static getLogger(_name: string) {
        return {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
        };
    }
}
