export class Logger {
    static getLogger(_name: string) {
        return {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };
    }
}
