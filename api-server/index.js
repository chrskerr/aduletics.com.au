
const _ = require( 'lodash' )
const stripe = require( 'stripe' )( process.env.STRIPE_KEY );
const sgMail = require( '@sendgrid/mail' );

sgMail.setApiKey( process.env.SENDGRID_KEY );

const express = require( 'express' );
const cors = require( 'cors' )
const bodyParser = require('body-parser')

const app = express();

// const whitelist = [ /localhost/, /www\.adultletics\.com\.au/ ];
// const corsOptionsDelegate = ( req, callback ) => {
// 	let corsOptions;
// 	whitelist.forEach( e => {
// 		if ( req.header( "Origin" ).match( e ) !== -1 ) {
// 			corsOptions = { origin: true };
// 		} else {
// 			corsOptions = { origin: false };
// 		}
// 	});
// 	callback( null, corsOptions );
// };
// app.use( cors( corsOptionsDelegate ))

app.use( cors({ origin: "https://www.adultletics.com.au" }))
app.use( bodyParser.json())

app.post( '/', async ( req, res ) => {
    const body = _.get( req, "body" )

    const email = _.get( body, "billing_details.email" );
    const name = _.get( body, "billing_details.name" );
    const payment_method = _.get( body, "payment_method" );

    try {
        if ( !email || !name || !payment_method ) throw "input data missing";

        const existingCustomerResponse = await stripe.customers.list({ email, limit: 100 });
        const existingCustomerData = _.get( existingCustomerResponse, "data")
        const existingActiveSubscriptions = _.filter( _.flatMap( existingCustomerData, "subscriptions.data"), ({ status }) => status === "trialing" || status === "active" );

        if ( _.size( existingActiveSubscriptions ) > 0 ) return res.status( 200 ).send({ existing_subscriber: true })
        
        const customer = await stripe.customers.create({
            payment_method, email, name,
            invoice_settings: { default_payment_method: payment_method },
        });
            
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ plan: "plan_HErzLEF4DA6PKy" }],
            trial_from_plan: true,
        });

        const { status } = subscription;
        if ( status === "active" || status === "trialing" ) sendWelcomeEmail( email, name );

        return res.status( 200 ).send( subscription );

    } catch ( error ) {
        console.error( error );
        sendFailEmail();
        return res.status( 500 ).send({ error });
    }
});

const port = process.env.PORT || 8080;
app.listen( port, () => {
    console.log('Listening on port', port);
});


const sendWelcomeEmail = async ( email, name ) => {
    const msg = {
        to: email,
        bcc: 'kate@adultletics.com.au',
        from: {
            email: 'info@adultletics.com.au',
            name: "Adultletics Running Club",
        },
        dynamic_template_data: { name },
        template_id: "d-b320f002c5034a3fbf41a3d1a11f7511",
    };

    try {
        await sgMail.send( msg );
    } catch ( error ) {
        console.error( error );
        if ( error.response ) console.error( error.response.body );
        sendFailEmail();
    }
}

const sendFailEmail = async () => {
    const msg = {
        to: 'chriskerr@me.com',
        cc: 'kate@adultletics.com.au',
        from: {
            email: 'info@adultletics.com.au',
            name: "Adultletics Running Club",
        },
        subject: "A Stripe API Server error has occured",
    };

    try {
        await sgMail.send( msg )
    } catch ( error ) {
        console.error( error );
        if ( error.response ) console.error( error.response.body )
    }
}
