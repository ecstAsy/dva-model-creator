import { call, put, select, take, cancel } from 'redux-saga/effects';
import { Action, ActionCreator } from './actionCreatorFactory';
import * as warning from 'warning';

export * from './actionCreatorFactory';

export type Handler<InS extends OutS, OutS, P> = (state: InS, payload: P) => OutS;

interface Model<T> {
  namespace: string;
  state?: T;
  reducers?: any;
  effects?: any;
  subscriptions?: any;
}

export interface EffectsCommandMap {
  put: typeof put;
  call: typeof call;
  select: typeof select;
  take: typeof take;
  cancel: typeof cancel;
}

export type EffectsHandler<P> = (payload: P, effects: EffectsCommandMap) => IterableIterator<any>;

export type EffectsHandlerWithAction<P> = (
  payload: Action<P>,
  effects: EffectsCommandMap
) => IterableIterator<any>;

export type EffectsWatcher = (effects: EffectsCommandMap) => IterableIterator<any>;

export class DvaModelBuilder<InS extends OutS, OutS = InS> {
  private model: Model<OutS>;

  constructor(initState: InS, namespace?: string) {
    this.model = {
      state: initState,
      namespace,
      effects: {},
      reducers: {},
    };
  }

  case = <P>(actionCreator: ActionCreator<P>, handler: Handler<InS, OutS, P>) => {
    this.checkType(actionCreator.type);
    this.model.reducers[actionCreator.originType] = (state, action) =>
      handler(state, action.payload);
    return this;
  };

  caseWithAction = <P>(actionCreator: ActionCreator<P>, handler: Handler<InS, OutS, Action<P>>) => {
    this.checkType(actionCreator.type);
    this.model.reducers[actionCreator.originType] = handler;
    return this;
  };

  takeEvery = <P>(actionCreator: ActionCreator<P>, handler: EffectsHandler<P>) => {
    return this.setEffects(actionCreator, function*({ payload }, effects) {
      yield handler(payload, effects);
    });
  };

  takeEveryWithAction = <P>(
    actionCreator: ActionCreator<P>,
    handler: EffectsHandlerWithAction<P>
  ) => {
    return this.setEffects(actionCreator, handler);
  };

  takeLatest = <P>(actionCreator: ActionCreator<P>, handler: EffectsHandler<P>) => {
    return this.setEffects(actionCreator, [
      function*({ payload }, effects) {
        yield handler(payload, effects);
      },
      { type: 'takeLatest' },
    ]);
  };

  takeLatestWithAction = <P>(
    actionCreator: ActionCreator<P>,
    handler: EffectsHandlerWithAction<P>
  ) => {
    return this.setEffects(actionCreator, [handler, { type: 'takeLatest' }]);
  };

  throttle = <P>(actionCreator: ActionCreator<P>, handler: EffectsHandler<P>, ms?: number) => {
    return this.setEffects(actionCreator, [
      function*({ payload }, effects) {
        yield handler(payload, effects);
      },
      { type: 'throttle', ms },
    ]);
  };

  throttleWithAction = <P>(
    actionCreator: ActionCreator<P>,
    handler: EffectsHandlerWithAction<P>,
    ms?: number
  ) => {
    return this.setEffects(actionCreator, [handler, { type: 'throttle', ms }]);
  };

  watcher = <P>(actionCreator: ActionCreator<P>, handler: EffectsWatcher) => {
    return this.setEffects(actionCreator, [handler, { type: 'watcher' }]);
  };

  build = () => {
    return this.model;
  };

  private setEffects = <P>(actionCreator: ActionCreator<P>, data: any) => {
    this.checkType(actionCreator.type);
    this.model.effects[actionCreator.originType] = data;
    return this;
  };

  private checkType(type: string) {
    const { namespace } = this.model;
    if (namespace) {
      const action = type.split('/');
      warning(action.length === 2, `action ${type} in model "${namespace}" should have namespace`);
      if (action.length === 2) {
        warning(
          action[0] === namespace,
          `action "${type}" can't be effects or reducers in model "${namespace}"`
        );
      }
    }
  }
}
