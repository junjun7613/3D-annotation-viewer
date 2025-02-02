declare module 'CETEIcean' {
  export default class CETEI {
    constructor(base?: string);
    addBehaviors(behaviors: object): void;
    getHTML5(xml: string): Promise<HTMLElement>;
  }
}
