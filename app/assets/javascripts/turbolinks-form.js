(function($) {

  // As documented on the reference below, turbolinks 5 does not treat a render
  // after a form submit by default, leaving the users to implement their own
  // solutions.
  //
  // https://github.com/turbolinks/turbolinks/issues/85#issuecomment-323446272
  //
  // The code below imitates the behavior of turbolinks when treating regular GET
  // responses. Namely, it:
  //   - Replaces only the body of the page
  //   - It runs all script tags on the body of the new page
  //   - It fires the turbolinks:load event
  //
  // This doesn't mean it does ALL what turbolinks does. For example, we don't
  // merge script tags from old and new page <head> elements.
  // This also doesn't change the browser history or does any change to the URL.
  // The reason we don't do such things is simply that this is a solution to
  // render errors in forms, and usually we render the same page/form rendered
  // before the submit.
  var handleResponse = function(responseText, target) {
    // parses response
    var newDom = new DOMParser().parseFromString(responseText, "text/html");

    // Some browsers (PhantomJS and earlier versions of Firefox and IE) don't implement
    // parsing from string for "text/html" format. So we use an alternative method
    // described here:
    // https://developer.mozilla.org/en-US/Add-ons/Code_snippets/HTML_to_DOM#Parsing_Complete_HTML_to_DOM
    if (newDom == null) {
      newDom = document.implementation.createHTMLDocument("document");
      newDom.documentElement.innerHTML = responseText;
    }

    if (newDom == null) {
      console.error("turbolinks-form was not able to parse response from server.");
    }

    // dispatches turbolinks event
    Turbolinks.dispatch('turbolinks:before-render', {data: {newBody: newDom.body}});

    // Removes/saves all script tags contents.
    // Most browsers don't run the new <script> tags when we replace the page body,
    // but some do (like PhantomJS). So we clear all script tags to ensure nothing
    // will run on any browser.
    var newBodyScripts = newDom.body.getElementsByTagName('script');
    var newBodyScriptContents = [];
    for (var i=0; i<newBodyScripts.length; i++) {
      var script = newBodyScripts[i];
      newBodyScriptContents.push(script.text);
      script.text = "";
    }

    if (target === document.body) {
      document.body = newDom.body;
      target = document.body;
    } else {
      while (target.firstChild) {
        target.removeChild(target.firstChild);
      }
      while (newDom.body.firstChild) {
        target.appendChild(newDom.body.removeChild(newDom.body.firstChild));
      }
    }

    // dispatches turbolinks event
    Turbolinks.dispatch('turbolinks:render');

    // Add scripts to body, so they are run on any browser
    var bodyScripts = target.getElementsByTagName('script');
    for (var i=0; i<bodyScripts.length; i++) {
      var script = bodyScripts[i];
      var newScript = document.createElement("script");
      newScript.text = newBodyScriptContents[i];
      script.parentNode.replaceChild(newScript, script);
    }

    Turbolinks.dispatch("turbolinks:load");
    window.scroll(0, 0);
  }

  // Sets up event delegation to forms with data-turbolinks-form attribute
  $(document).on("ajax:beforeSend", "[data-turbolinks-form]", function(e) {
    var xhr = e.detail[0];

    // adds the turbolinks-form-submit header for forms with data-turbolinks-form
    // attribute being submitted
    xhr.setRequestHeader('turbolinks-form-submit', '1');

    // dispatches turbolinks event
    Turbolinks.dispatch('turbolinks:request-start', {data: {xhr: xhr}});
  });

  $.fn.renderTurbolinksForm = function(responseText) {
    var target = this[0];
    if (!target) return this;

    handleResponse(responseText, target);

    return this;
  };

}(jQuery));
