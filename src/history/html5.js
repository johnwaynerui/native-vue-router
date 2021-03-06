/* @flow */

import type Router from '../index'
import { History } from './base'
import { cleanPath } from '../util/path'
import { setupScroll, handleScroll } from '../util/scroll'
import { pushState, replaceState } from '../util/push-state'
import { warn } from '../util/warn'
export class HTML5History extends History {
  constructor (router: Router, base: ?string) {
    super(router, base)

    const expectScroll = router.options.scrollBehavior

    if (expectScroll) {
      setupScroll()
    }

    window.addEventListener('popstate', event => {
      const state = event.state
      // 后退
      const preHistory = router.historyStack[router.historyIndex - 1]
      const nextHistory = router.historyStack[router.historyIndex + 1]
      if (preHistory && state.key === preHistory.key) {
          router.historyIndex--
          this.onPopState('back', state.path)
      } else if (nextHistory) {
          if (state.key === nextHistory.key) {
              router.historyIndex++
              this.onPopState('forward', state.path)
          } else {
              // 第二页刷新之后，进行了前进，然后后退，回到第二页的时候，再点后退的情况下
              this.onPopState('back', state.path)
              router.historyStack.unshift(state)
          }
      } else {
          this.onPopState('back', state.path)
          router.historyStack[self.historyIndex] = state
      }
    })
  }

  onPopState (method: string, location: string) {
    const current = this.current
    if (method === 'back') {
      this.transitionTo('back', getLocation(this.base))
    } else if (method === 'forward') {
      this.transitionTo('push', getLocation(this.base))
    }
  }

  go (n: number) {
    window.history.go(n)
  }

  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo('push', location, route => {
      pushState(this.router, cleanPath(this.base + route.fullPath))
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo('replace', location, route => {
      replaceState(this.router, cleanPath(this.base + route.fullPath))
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  ensureURL (method: string, push?: boolean) {
    if (method === 'back') {
      return
    }
    // this.router.historyStack.length 用来做初始化时将默认地址做一次replace，同时添加到router.historyStack[0]
    if (getLocation(this.base) !== this.current.fullPath ||  method === 'init') {
      if (method === 'init') {
        let defaultPath = getDefaultPath(this.router.options.routes)
        if (defaultPath.indexOf('/')) {
          warn(false, 'default path must start with /, not support params or querys')
        }
        if (defaultPath !== '' && defaultPath !== this.current.fullPath) {
          this.router.defaultPath = defaultPath
          // 这里把push设置为true，只是为了在这种情况下使下面的三目运算符判断走push逻辑
          // 而不至于影响其他的情况
          push = true
          // 把浏览器第一个历史记录替换掉
          replaceState(this.router, cleanPath(this.base + defaultPath))
        }

      }
      const current = cleanPath(this.base + this.current.fullPath)
      push ? pushState(this.router, current) : replaceState(this.router, current)
    }
  }
  getCurrentLocation (): string {
    return getLocation(this.base)
  }
}
// 获取routes配置中默认的路由的path
export function getDefaultPath (routes): string {
    let i = 0
    // let routes = this.router.options.routes
    while(i <= routes.length - 1) {
      if (routes[i].default) {
        return routes[i].path
      }
      i++
    }
    return ''
}
export function getLocation (base: string): string {
  let path = window.location.pathname
  if (base && path.indexOf(base) === 0) {
    path = path.slice(base.length)
  }
  return (path || '/') + window.location.search + window.location.hash
}
