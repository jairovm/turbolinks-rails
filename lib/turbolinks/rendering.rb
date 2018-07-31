module Turbolinks
  module Rendering
    extend ActiveSupport::Concern

    def render(*args, &block)
      options = args.dup.extract_options!

      if options[:location].blank? && turbolinks_form_request?
        render_with_turbolinks(*args, &block)
      else
        super
      end
    end

    private

    def turbolinks_form_request?
      request.xhr? && !request.get? && request.headers['turbolinks-form-submit']
    end

    def render_with_turbolinks(*args, &block)
      self.response_body    = build_turbolinks_response_to_render(*args, &block)
      self.status           = 200
      response.content_type = 'text/javascript'
    end

    def build_turbolinks_response_to_render(*args, &block)
      target, options = prepare_render_options(*args, &block)
      html            = render_to_string(options, &block)
      escaped_html    = ActionController::Base.helpers.j(html)

      <<~JS
        (function(){
          $('#{target || 'body'}').renderTurbolinksForm('#{escaped_html}');
        })();
      JS
    end

    def prepare_render_options(*args, &block)
      options          = args.extract_options!
      target           = options.delete(:target)
      options[:layout] = false if target.present?

      unless options.symbolize_keys.has_key?(:action)
        case action_name
        when 'create' then options[:action] = :new
        when 'update' then options[:action] = :edit
        end
      end

      [target, _normalize_render(*(args << options), &block)]
    end
  end
end
