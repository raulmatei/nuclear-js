import './console-polyfill'
import getter from './getter'

export { default as Store } from './store'
export { default as Reactor } from './reactor'
export { toJS, toImmutable, isImmutable } from './immutable-helpers'
export { isKeyPath } from './key-path'
export { default as createReactMixin } from './create-react-mixin'

export const isGetter = getter.isGetter;

