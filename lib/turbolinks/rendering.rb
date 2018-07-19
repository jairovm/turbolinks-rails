module Turbolinks
  module Rendering
    extend ActiveSupport::Concern

    def render(*args, &block)
      options = args.dup.extract_options!

      if options[:location].blank? && turbolinks_form_request?
        render_with_turbolinks(options, &block)
      else
        super
      end
    end

    private

    def turbolinks_form_request?
      request.xhr? && !request.get? && request.headers['turbolinks-form-submit']
    end

    def render_with_turbolinks(options, &block)
      self.response_body = build_turbolinks_response_to_render(options, &block)
      self.status = 200
      response.content_type = 'text/javascript'
    end

    def build_turbolinks_response_to_render(options, &block)
      html = render_to_string(prepare_render_options(options), &block)
      escaped_html = ActionController::Base.helpers.j(html)

      <<-JS
(function(){
  $('#{options[:target] || 'body'}').renderTurbolinksForm('#{escaped_html}');
})();
      JS
    end

    def prepare_render_options(options)
      render_options = {}

      render_options[:layout] = false if options[:target].present?

      if options[:template].present?
        render_options[:action] = options[:template]
      else
        case action_name
        when 'create' then render_options[:action] = 'new'
        when 'update' then render_options[:action] = 'edit'
        end
      end

      render_options
    end
  end
end
