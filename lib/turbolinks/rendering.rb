module Turbolinks
  module Rendering
    extend ActiveSupport::Concern

    def render(*args, &block)
      options = args.dup.extract_options!

      if options.key?(:target) && !options.key?(:location)
        raise 'Using `target` without fallback `location` is not allowed.'
      end

      if turbolinks_form_request?
        # Hack to support respond_with :location
        if options.key?(:location) && !options.key?(:target)
          super
        else
          render_with_turbolinks(*args, &block)
        end

      elsif options.key?(:target) && options.key?(:location)
        redirect_to options[:location]
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
      response.headers['turbolinks-form-render'] = '1'
    end

    def build_turbolinks_response_to_render(*args, &block)
      target, options = prepare_render_options(*args, &block)
      html            = render_to_string(options, &block)
      escaped_html    = ActionController::Base.helpers.j(html)

      <<~JS
        (function(){
          TurbolinksForm.#{target[:action]}('#{target[:selector]}', '#{escaped_html}');
        })();
      JS
    end

    def prepare_render_options(*args, &block)
      options         = args.extract_options!
      target          = options.delete(:target) || {}
      allowed_actions = %i[append remove render replace].freeze

      options[:layout] = false if target.present?

      target[:action]   ||= :render
      target[:selector] ||= :body

      unless allowed_actions.include?(target[:action].to_sym)
        raise "`#{target[:action]}` action is not allowed"
      end

      unless options.symbolize_keys.key?(:action)
        case action_name
        when 'create' then options[:action] = :new
        when 'update' then options[:action] = :edit
        end
      end

      [target, _normalize_render(*(args << options), &block)]
    end
  end
end
