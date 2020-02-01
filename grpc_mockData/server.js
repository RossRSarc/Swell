const path = require("path");
const Mali = require("mali");
const hl = require("highland");
const grpc = require('grpc');

const PROTO_PATH = path.join(__dirname, "./protos/hw2.proto");
const HOSTPORT = "0.0.0.0:50051";

const dataStream = [
  {
    message: "You"
  },
  {
    message: "Are"
  },
  {
    message: "doing IT"
  },
  {
    message: "Champ"
  }
];

/**
 * Implements the SayHello RPC method.
 */

// Unary stream
// ctx = watch execution context
function sayHello(ctx) {
  // create new metadata
  let metadata = new grpc.Metadata();
  metadata.set('it', 'works?')
  metadata.set('indeed', 'it do')
  // Watcher creates a watch execution context for the watch
  // The execution context provides scripts and templates with access to the watch metadata
  console.dir(ctx.metadata, { depth: 3, colors: true });
  console.log(`got sayHello request name: ${ctx.req.name}`);
  
  // an alias to ctx.response.res
  // This is set only in case of DUPLEX calls, to the the gRPC call reference itself
  ctx.res = { message: "Hello " + ctx.req.name };

  // send response header metadata object directly as an argument and that is set and sent
  metadata.set('UNARY', 'yes')
  ctx.sendMetadata(metadata)

  console.log(`set sayHello response: ${ctx.res.message}`);
}

// Server-Side Stream
// used highland library to manage asynchronous data
async function sayHellos(ctx) {
  // create new metadata
  let metadata = new grpc.Metadata();
  metadata.set('it', 'works?')
  metadata.set('indeed', 'it do')
  // The execution context provides scripts and templates with access to the watch metadata
  console.dir(ctx.metadata, { depth: 3, colors: true });
  // converts a request into strings
  console.log(`got sayHellos request name:`, JSON.stringify(ctx.req, null, 4));

  // alias for ctx.request.req
  // In case of UNARY and RESPONSE_STREAM calls it is simply the gRPC call's request
  let reqMessages = {"message": 'hello!!! ' + ctx.req.name}
 
  let streamData = await hl(reqMessages)
  ctx.res = streamData;

  // send response header metadata object directly as an argument and that is set and sent
  metadata.set('serverStream', 'indeed')
  ctx.sendMetadata(metadata)

  console.log(`done sayHellos`);
  // ends server stream
  ctx.res.end()
}

// Client-Side stream
function sayHelloCs (ctx) {
  // create new metadata
  let metadata = new grpc.Metadata();
  metadata.set('it', 'works?')
  metadata.set('indeed', 'it do')
  metadata.set('clientStream', 'indubitably')
  // The execution context provides scripts and templates with access to the watch metadata
  console.dir(ctx.metadata, { depth: 3, colors: true })
  console.log('got sayHelloClients')
  let counter = 0;
  let messages = [];
  // client streaming calls to write messages and end writing before you can get the response
  return new Promise((resolve, reject) => {
    hl(ctx.req)
      .map(message => {
        counter++
        console.log('message content',message.name)
        ctx.response.res = { message: 'Client stream: ' + message.name }
        ctx.sendMetadata(metadata)
      })
      // returns all the elements as an array
      .collect()
      .toCallback((err, result) => {
        if (err) return reject(err)
        console.log(`done sayHelloClients counter ${counter}`)
        ctx.response.res = { message: 'SAYHELLOCs Client stream: ' + messages }
        console.log(ctx.response.res)
        resolve()
      })
  })
}

// Bi-Di stream
function sayHelloBidi(ctx) {
  // create new metadata
  let metadata = new grpc.Metadata();
  metadata.set('it', 'works?')
  metadata.set('indeed', 'it do')
  console.log("got sayHelloBidi");
  // The execution context provides scripts and templates with access to the watch metadata
  console.dir(ctx.metadata, { depth: 3, colors: true });
  let counter = 0;
  ctx.req.on("data", d => {
    counter++;
    ctx.res.write({ message: "bidi stream: " + d.name });
  });
  metadata.set('bidiStream', 'ohyes')
  ctx.sendMetadata(metadata);
  // calls end to client before closing server
  ctx.req.on("end", () => {
    console.log(`done sayHelloBidi counter ${counter}`);
    // ends server stream
    ctx.res.end();
  });
}

/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
function main() {
  const app = new Mali(PROTO_PATH, "Greeter");
  app.use({ sayHello, sayHellos, sayHelloCs, sayHelloBidi });
  app.start(HOSTPORT);
  console.log(`Greeter service running @ ${HOSTPORT}`);
}

main();
