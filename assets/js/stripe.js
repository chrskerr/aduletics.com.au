
const url = "https://stripe-server-xdzmzxo7uq-lz.a.run.app/";
const stripe = Stripe( 'pk_test_Fl19stXoPXnQwM41LT9VQ3Gi00SQ1ugcZp' );

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
                <p>You get...</p>
                <p><strong>$23 AUD per week, no lock in contracts</strong></p>
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
        <div class="background" onclick="(() => $( '#checkout' ).remove())()">
            <i class="far fa-times" style="color: white;"></i>
        </div>
    </div>
`;

const openCheckout = () => {
    const isAlreadyOpen = $( "#checkout" ).length > 0;
    if ( isAlreadyOpen ) return;

    gtag( "event", "begin-checkout" );
    $( "body" ).append( modalHtml );

    const elements = stripe.elements();
    const cardElement = elements.create('card', { style });
    cardElement.mount('#card-element');
    cardElement.addEventListener('change', _handleChange );

    $( "#subscription-form" ).on( "submit", event => _submitForm( event, cardElement ));
};

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
        console.error( "Stripe Error:", data.error );
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
                    <h3>Thank you for signing up, and welcome to the club!</h3>
                    <p>An email is on its way to you shortly with more information.</p>
                `);
                return
            }

            throw "uncaught outcome"

        } catch ( error ) {
            gtag( "event", "server_error", { value: error });
            displayError.textContent = `Something went wrong. Please try again!`;
            $( "#button-loader" ).removeClass( "fa-spin fa-spinner" ).addClass( "fa-check" );
            $( "#submit-button" ).prop( "disabled", false );
        }
    }
};
