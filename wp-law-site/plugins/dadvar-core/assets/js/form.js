/**
 * Consultation form — progressive enhancement.
 * Without JavaScript the form still posts to admin-post.php and works.
 */
( function () {
	'use strict';

	var cfg = window.dadvarForm || {};
	var msg = cfg.messages || {};

	function toLatin( value ) {
		return String( value )
			.replace( /[۰-۹]/g, function ( d ) { return String( d.charCodeAt( 0 ) - 1776 ); } )
			.replace( /[٠-٩]/g, function ( d ) { return String( d.charCodeAt( 0 ) - 1632 ); } );
	}

	function phoneValid( value ) {
		var v = toLatin( value ).trim();
		if ( /[^0-9+\-\s().]/.test( v ) ) { return false; }
		var plus = v.charAt( 0 ) === '+';
		var digits = v.replace( /\D+/g, '' );
		if ( plus && digits.indexOf( '98' ) === 0 ) { digits = '0' + digits.slice( 2 ); plus = false; }
		if ( digits.length < 8 || digits.length > 15 ) { return false; }
		return ! ( ! plus && digits.indexOf( '09' ) === 0 && digits.length !== 11 );
	}

	function setError( field, text ) {
		var wrap = field.closest( '.dv-field' );
		var box = wrap ? wrap.querySelector( '[data-dv-error]' ) : null;
		if ( text ) {
			field.setAttribute( 'aria-invalid', 'true' );
			if ( wrap ) { wrap.classList.add( 'is-invalid' ); }
		} else {
			field.removeAttribute( 'aria-invalid' );
			if ( wrap ) { wrap.classList.remove( 'is-invalid' ); }
		}
		if ( box ) { box.textContent = text || ''; }
	}

	function validateField( field ) {
		var value = field.type === 'checkbox' ? field.checked : field.value.trim();
		var text = '';
		if ( field.required && ! value ) {
			text = field.name === 'dv_consent' ? msg.consent : msg.required;
		} else if ( field.name === 'dv_phone' && value && ! phoneValid( value ) ) {
			text = msg.phone;
		} else if ( field.type === 'email' && value && ! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( value ) ) {
			text = msg.email;
		} else if ( field.maxLength > 0 && field.value.length > field.maxLength ) {
			text = msg.tooLong;
		}
		setError( field, text );
		return ! text;
	}

	function setStatus( form, text, type ) {
		var box = form.querySelector( '[data-dv-status]' );
		if ( ! box ) { return; }
		box.innerHTML = '';
		if ( ! text ) { return; }
		var p = document.createElement( 'p' );
		p.className = 'dv-form__notice dv-form__notice--' + type;
		p.textContent = text;
		box.appendChild( p );
		box.focus();
	}

	function refreshToken( form ) {
		if ( form.dataset.dvTokenFresh || ! cfg.tokenUrl || ! window.fetch ) { return; }
		form.dataset.dvTokenFresh = '1';
		window.fetch( cfg.tokenUrl, { credentials: 'same-origin', cache: 'no-store' } )
			.then( function ( r ) { return r.ok ? r.json() : null; } )
			.then( function ( data ) {
				if ( data && data.token ) { form.elements.dv_token.value = data.token; }
			} )
			.catch( function () {} );
	}

	function send( form, button, retried ) {
		var originalLabel = button.dataset.label || button.textContent;
		button.dataset.label = originalLabel;
		button.disabled = true;
		button.setAttribute( 'aria-busy', 'true' );
		button.textContent = msg.sending;

		var done = function () {
			button.disabled = false;
			button.removeAttribute( 'aria-busy' );
			button.textContent = originalLabel;
		};

		window.fetch( cfg.endpoint, { method: 'POST', body: new FormData( form ), credentials: 'same-origin' } )
			.then( function ( r ) { return r.json().catch( function () { return { ok: false }; } ); } )
			.then( function ( data ) {
				if ( data && data.code === 'too_fast' && ! retried ) {
					window.setTimeout( function () { send( form, button, true ); }, 3200 );
					return;
				}
				done();
				if ( data && data.ok ) {
					form.reset();
					setStatus( form, data.code === 'duplicate' ? data.message : form.dataset.success, 'success' );
					return;
				}
				var errors = ( data && data.errors ) || {};
				Object.keys( errors ).forEach( function ( name ) {
					var field = form.elements[ name ];
					if ( field ) { setError( field, errors[ name ] ); }
				} );
				setStatus( form, ( data && data.message ) || msg.network, 'error' );
			} )
			.catch( function () {
				done();
				setStatus( form, msg.network, 'error' );
			} );
	}

	function enhance( form ) {
		var fields = form.querySelectorAll( 'input:not([type=hidden]), select, textarea' );
		form.addEventListener( 'focusin', function () { refreshToken( form ); } );
		fields.forEach( function ( field ) {
			if ( field.name === 'dv_website' ) { return; }
			// Re-check while the person corrects a field, so errors disappear immediately.
			var recheck = function () {
				if ( field.getAttribute( 'aria-invalid' ) ) { validateField( field ); }
			};
			field.addEventListener( 'input', recheck );
			field.addEventListener( 'change', recheck );
			field.addEventListener( 'blur', function ( event ) {
				// Moving to the submit button: validate on submit instead. Validating here
				// would shift the layout under the pointer and swallow the click.
				var next = event.relatedTarget;
				if ( next && next.type === 'submit' ) { return; }
				if ( field.value && field.type !== 'checkbox' ) { validateField( field ); }
			} );
		} );
		form.addEventListener( 'submit', function ( event ) {
			if ( ! window.fetch || ! window.FormData || ! cfg.endpoint ) { return; }
			event.preventDefault();
			var firstInvalid = null;
			fields.forEach( function ( field ) {
				if ( field.name === 'dv_website' ) { return; }
				if ( ! validateField( field ) && ! firstInvalid ) { firstInvalid = field; }
			} );
			if ( firstInvalid ) {
				setStatus( form, msg.invalid, 'error' );
				firstInvalid.focus();
				return;
			}
			var button = form.querySelector( '[type=submit]' );
			send( form, button, false );
		} );
	}

	document.querySelectorAll( '[data-dv-form]' ).forEach( enhance );
}() );
