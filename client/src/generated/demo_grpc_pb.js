// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var demo_pb = require('./demo_pb.js');

function serialize_demo_DataRequest(arg) {
  if (!(arg instanceof demo_pb.DataRequest)) {
    throw new Error('Expected argument of type demo.DataRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_demo_DataRequest(buffer_arg) {
  return demo_pb.DataRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_demo_DataResponse(arg) {
  if (!(arg instanceof demo_pb.DataResponse)) {
    throw new Error('Expected argument of type demo.DataResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_demo_DataResponse(buffer_arg) {
  return demo_pb.DataResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


// Service definition for performance testing
var PerformanceTestServiceService = exports.PerformanceTestServiceService = {
  // Single request-response for testing
processData: {
    path: '/demo.PerformanceTestService/ProcessData',
    requestStream: false,
    responseStream: false,
    requestType: demo_pb.DataRequest,
    responseType: demo_pb.DataResponse,
    requestSerialize: serialize_demo_DataRequest,
    requestDeserialize: deserialize_demo_DataRequest,
    responseSerialize: serialize_demo_DataResponse,
    responseDeserialize: deserialize_demo_DataResponse,
  },
  // Streaming for high-throughput testing
processDataStream: {
    path: '/demo.PerformanceTestService/ProcessDataStream',
    requestStream: true,
    responseStream: true,
    requestType: demo_pb.DataRequest,
    responseType: demo_pb.DataResponse,
    requestSerialize: serialize_demo_DataRequest,
    requestDeserialize: deserialize_demo_DataRequest,
    responseSerialize: serialize_demo_DataResponse,
    responseDeserialize: deserialize_demo_DataResponse,
  },
};

exports.PerformanceTestServiceClient = grpc.makeGenericClientConstructor(PerformanceTestServiceService, 'PerformanceTestService');
