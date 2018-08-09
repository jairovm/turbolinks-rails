class TurbolinksForm {
  constructor(target, html) {
    this.target = target
    this.html   = html
  }

  get newDom() {
    if (this._newDom) return this._newDom

    this._newDom = new DOMParser().parseFromString(this.html, 'text/html')

    // Some browsers (PhantomJS and earlier versions of Firefox and IE) don't
    // implement parsing from string for 'text/html' format. So we use an
    // alternative method described here:
    // https://developer.mozilla.org/en-US/Add-ons/Code_snippets/HTML_to_DOM#Parsing_Complete_HTML_to_DOM
    if (this._newDom == null) {
      this._newDom = document.implementation.createHTMLDocument('document')
      this._newDom.documentElement.innerHTML = this.html
    }

    if (this._newDom == null) {
      console.error('turbolinks-form was not able to parse response from server.')
    }

    return this._newDom
  }

  get newBody() {
    if (this._newBody) return this._newBody
    this.removeScriptsFromDocument()
    return this._newBody = this.newDom.body
  }

  get scriptTexts() {
    if (this._scriptTexts) return this._scriptTexts

    this._scriptTexts = []

    const scripts = this.newDom.body.getElementsByTagName('script')
    for (var i=0, len=scripts.length; i<len; i++) {
      var script = scripts[i]
      this._scriptTexts.push(script.text)
      script.parentNode.removeChild(script)
    }

    return this._scriptTexts
  }

  removeScriptsFromDocument() { this.scriptTexts; }

  append() {
    while (this.newBody.firstChild) {
      this.target.appendChild(
        this.newBody.removeChild(this.newBody.firstChild)
      )
    }
  }

  remove() {
    this.target.parentNode.removeChild(this.target)
    this.target = null
  }

  render() {
    if (this.target === document.body) {
      document.body = this.newBody
      this.target   = document.body
    } else {
      while (this.target.firstChild) {
        this.target.removeChild(this.target.firstChild)
      }
      this.append()
    }
  }

  replace() {
    this.target.parentNode.replaceChild(this.newBody.firstChild, this.target)
  }

  executeScripts() {
    for (var i=0, len=this.scriptTexts.length; i<len; i++) {
      var script  = document.createElement('script')
      script.text = this.scriptTexts.pop()
      document.body.appendChild(script)
    }
  }

  scrollToTarget() {
    if (this.target) this.target.scrollIntoView()
  }

  //%i[append remove render replace].freeze
  static append(selector, html)  { this.process('append', selector, html)  }
  static remove(selector, html)  { this.process('remove', selector, html)  }
  static render(selector, html)  { this.process('render', selector, html)  }
  static replace(selector, html) { this.process('replace', selector, html) }

  static process(action, selector, html) {
    const target = document.querySelector(selector)
    if (!target) return null

    const object = new this(target, html)

    Turbolinks.dispatch('turbolinks:before-render', {
      data: {newBody: object.newDom.body}
    })

    object[action]()

    Turbolinks.dispatch('turbolinks:render')

    object.executeScripts()

    Turbolinks.dispatch('turbolinks:load')

    object.scrollToTarget()
  }
}

window.TurbolinksForm = TurbolinksForm

// Sets up event delegation to forms with data-turbolinks-form attribute
document.addEventListener('ajax:beforeSend', function(e) {
  if (e.target.getAttribute('data-turbolinks-form')) {
    var xhr = e.detail[0]

    // adds the turbolinks-form-submit header for forms with data-turbolinks-form
    // attribute being submitted
    xhr.setRequestHeader('turbolinks-form-submit', '1')

    // dispatches turbolinks event
    Turbolinks.dispatch('turbolinks:request-start', {data: {xhr: xhr}})
  }
})
