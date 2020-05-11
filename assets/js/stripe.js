
const url = "https://stripe-server-xdzmzxo7uq-lz.a.run.app/";
const stripe = Stripe( 'pk_live_mwNb1i31QrYYF4ghnbGz0CuQ00WF3EYB1n' );

const style = {
    base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': { color: '#aab7c4' },
    },
    invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
    },
};

const modalHtml = `
    <div class="modal" id="checkout">
        <div class="content">
            <div>
                <h4>Adultletics Running Club Subscription</h4>
                <p style="margin-bottom: 0.5em;">What’s included:</p>
                <ul>
                    <li>x3 structured running sessions per week</li>
                    <li>x2 online strength training for runners sessions per week</li>
                    <li>x1 weekly team Q&A, check-in and workshop about a different running-related topic</li>
                    <li>A daily challenge, that changes weekly (this may be a physical or mental challenge)</li>
                    <li>Weekly drills to work on running technique and skill development</li>
                    <li>Connection to a like minded group of people for further support, laughs, motivation & inspiration</li>
                </ul>
                <p style="margin-bottom: 0;"><strong>First week is free</strong>, then membership is a flat <strong>$23AUD/per week.</strong> There are NO sign-up fees and NO lock-in contracts.</p>
                <p>Pay as you go and cancel anytime, no charge if you cancel in the first week.</p>
            </div>
            <form id="subscription-form">
                <div class="customer-details">
                    <div>
                        <label>Name</label>
                        <input type="text" required placeholder="Please enter your full name"></input>
                    </div>
                    <div>
                        <label>Email</label>
                        <input type="email" required placeholder="Please enter your email"></input>
                    </div>
                </div>
                <div>
                    <label>Card</label>
                    <div id="card-element" class="stripe-card"></div>
                </div>
                <div id="card-errors" role="alert"></div>
                <div>
                    <button type="submit" id="submit-button" style='margin-top: 1em;'>
                        Join
                        <i id='button-loader' class='fas fa-check' style='margin-left: 8px;'></i>
                    </button>
                </div>
            </form>
        </div>
        <div class="background" onclick="closeCheckout()">
            <i class="far fa-times" style="color: white;"></i>
        </div>
    </div>
`;

const openCheckout = () => {
    const isAlreadyOpen = $( "#checkout" ).length > 0;
    if ( isAlreadyOpen ) return;

    gtag( "event", "begin-checkout" );
    $( "body" ).append( modalHtml ).css({ position: "fixed", top: `-${ window.scrollY }px` });

    const elements = stripe.elements();
    const cardElement = elements.create('card', { style });
    cardElement.mount('#card-element');
    cardElement.addEventListener('change', _handleChange );

    $( "#subscription-form" ).on( "submit", event => _submitForm( event, cardElement ));
};

const closeCheckout = () => {
    const scrollY = $( "body" ).css( "top" );
    $( "#checkout" ).remove();
    $( "body" ).css({ position: "initial" });
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
}

const _handleChange = event => {
    const displayError = document.getElementById( 'card-errors' );
    if ( event.error ) {
        displayError.textContent = event.error.message;
    } else {
        displayError.textContent = '';
    }
};

const _submitForm = async ( event, cardElement ) => {
    event.preventDefault();

    $( "#button-loader" ).removeClass( "fa-check" ).addClass( "fa-spin fa-spinner" );
    $( "#submit-button" ).prop( "disabled", true );

    gtag( "event", "checkout_progress" );

    const displayError = document.getElementById( 'card-errors' );
    const name = event.target[0].value;
    const email = event.target[1].value;
    const data = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
            email,
            name,
        },
    });

    const { paymentMethod } = data;
    if ( data.error ) {
        $( "#button-loader" ).removeClass( "fa-spin fa-spinner" ).addClass( "fa-check" );
        $( "#submit-button" ).prop( "disabled", false );
    } else {
        try {
            const { billing_details, id } = paymentMethod;
            const response = await fetch( url, {
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    billing_details,
                    payment_method: id,
                }),
            });

            const subscription = await response.json();

            if ( subscription.existing_subscriber ) {
                gtag( "event", "existing_subscriber" );
                $( "#checkout > .content" ).empty().append( `<p style="margin-bottom: 0; text-align: center;">Looks like you're already a member with us :)</p>` );
                return
            }

            const { latest_invoice, status } = subscription;
            const { payment_intent } = latest_invoice;

            if ( payment_intent ) {
                const { client_secret, status } = payment_intent;
                if ( status === 'requires_action' ) {
                    const result = await stripe.confirmCardPayment( client_secret );
                    if ( result.error ) {
                        displayError.textContent = `Card declined due to ${ result.error.decline_code.replace( "_", " " ) }. Please try again!`;
                        $( "#button-loader" ).removeClass( "fa-spin fa-spinner" ).addClass( "fa-check" );
                        $( "#submit-button" ).prop( "disabled", false );
                        return;
                    }
                }
            }

            if ( status === "active" || status === "trialing" ) {
                gtag( "event", "purchase" );
                $( "#checkout > .content" ).empty().append(`
                    <h3 style="letter-spacing: 2px;">Thank you for signing up, and welcome to the club!</h3>
                    <p style="margin-bottom: 0;">An email is on its way to you shortly with more information.</p>
                `);
                return
            }

            throw "uncaught outcome"

        } catch ( error ) {
            console.error( error )
            gtag( "event", "server_error", { value: error });
            displayError.textContent = `Something went wrong. Please try again!`;
            $( "#button-loader" ).removeClass( "fa-spin fa-spinner" ).addClass( "fa-check" );
            $( "#submit-button" ).prop( "disabled", false );
        }
    }
};
