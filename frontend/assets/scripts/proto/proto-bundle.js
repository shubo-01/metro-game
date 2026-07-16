/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.xunxian = (function() {

    /**
     * Namespace xunxian.
     * @exports xunxian
     * @namespace
     */
    var xunxian = {};

    xunxian.auth = (function() {

        /**
         * Namespace auth.
         * @memberof xunxian
         * @namespace
         */
        var auth = {};

        auth.WxLoginRequest = (function() {

            /**
             * Properties of a WxLoginRequest.
             * @memberof xunxian.auth
             * @interface IWxLoginRequest
             * @property {string|null} [code] WxLoginRequest code
             * @property {string|null} [deviceId] WxLoginRequest deviceId
             */

            /**
             * Constructs a new WxLoginRequest.
             * @memberof xunxian.auth
             * @classdesc Represents a WxLoginRequest.
             * @implements IWxLoginRequest
             * @constructor
             * @param {xunxian.auth.IWxLoginRequest=} [properties] Properties to set
             */
            function WxLoginRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * WxLoginRequest code.
             * @member {string} code
             * @memberof xunxian.auth.WxLoginRequest
             * @instance
             */
            WxLoginRequest.prototype.code = "";

            /**
             * WxLoginRequest deviceId.
             * @member {string} deviceId
             * @memberof xunxian.auth.WxLoginRequest
             * @instance
             */
            WxLoginRequest.prototype.deviceId = "";

            /**
             * Creates a new WxLoginRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.WxLoginRequest
             * @static
             * @param {xunxian.auth.IWxLoginRequest=} [properties] Properties to set
             * @returns {xunxian.auth.WxLoginRequest} WxLoginRequest instance
             */
            WxLoginRequest.create = function create(properties) {
                return new WxLoginRequest(properties);
            };

            /**
             * Encodes the specified WxLoginRequest message. Does not implicitly {@link xunxian.auth.WxLoginRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.WxLoginRequest
             * @static
             * @param {xunxian.auth.IWxLoginRequest} message WxLoginRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            WxLoginRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.code);
                if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.deviceId);
                return writer;
            };

            /**
             * Encodes the specified WxLoginRequest message, length delimited. Does not implicitly {@link xunxian.auth.WxLoginRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.WxLoginRequest
             * @static
             * @param {xunxian.auth.IWxLoginRequest} message WxLoginRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            WxLoginRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a WxLoginRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.WxLoginRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.WxLoginRequest} WxLoginRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            WxLoginRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.WxLoginRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.string();
                            break;
                        }
                    case 2: {
                            message.deviceId = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a WxLoginRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.WxLoginRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.WxLoginRequest} WxLoginRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            WxLoginRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a WxLoginRequest message.
             * @function verify
             * @memberof xunxian.auth.WxLoginRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            WxLoginRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isString(message.code))
                        return "code: string expected";
                if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                    if (!$util.isString(message.deviceId))
                        return "deviceId: string expected";
                return null;
            };

            /**
             * Creates a WxLoginRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.WxLoginRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.WxLoginRequest} WxLoginRequest
             */
            WxLoginRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.WxLoginRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.WxLoginRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.WxLoginRequest();
                if (object.code != null)
                    message.code = String(object.code);
                if (object.deviceId != null)
                    message.deviceId = String(object.deviceId);
                return message;
            };

            /**
             * Creates a plain object from a WxLoginRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.WxLoginRequest
             * @static
             * @param {xunxian.auth.WxLoginRequest} message WxLoginRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            WxLoginRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = "";
                    object.deviceId = "";
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                    object.deviceId = message.deviceId;
                return object;
            };

            /**
             * Converts this WxLoginRequest to JSON.
             * @function toJSON
             * @memberof xunxian.auth.WxLoginRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            WxLoginRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for WxLoginRequest
             * @function getTypeUrl
             * @memberof xunxian.auth.WxLoginRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            WxLoginRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.WxLoginRequest";
            };

            return WxLoginRequest;
        })();

        auth.WxLoginResponse = (function() {

            /**
             * Properties of a WxLoginResponse.
             * @memberof xunxian.auth
             * @interface IWxLoginResponse
             * @property {number|null} [code] WxLoginResponse code
             * @property {string|null} [msg] WxLoginResponse msg
             * @property {string|null} [token] WxLoginResponse token
             * @property {string|null} [refreshToken] WxLoginResponse refreshToken
             * @property {boolean|null} [needBindPhone] WxLoginResponse needBindPhone
             * @property {string|null} [openid] WxLoginResponse openid
             * @property {boolean|null} [hasCharacter] WxLoginResponse hasCharacter
             * @property {xunxian.auth.IPlayerBrief|null} [playerInfo] WxLoginResponse playerInfo
             */

            /**
             * Constructs a new WxLoginResponse.
             * @memberof xunxian.auth
             * @classdesc Represents a WxLoginResponse.
             * @implements IWxLoginResponse
             * @constructor
             * @param {xunxian.auth.IWxLoginResponse=} [properties] Properties to set
             */
            function WxLoginResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * WxLoginResponse code.
             * @member {number} code
             * @memberof xunxian.auth.WxLoginResponse
             * @instance
             */
            WxLoginResponse.prototype.code = 0;

            /**
             * WxLoginResponse msg.
             * @member {string} msg
             * @memberof xunxian.auth.WxLoginResponse
             * @instance
             */
            WxLoginResponse.prototype.msg = "";

            /**
             * WxLoginResponse token.
             * @member {string} token
             * @memberof xunxian.auth.WxLoginResponse
             * @instance
             */
            WxLoginResponse.prototype.token = "";

            /**
             * WxLoginResponse refreshToken.
             * @member {string} refreshToken
             * @memberof xunxian.auth.WxLoginResponse
             * @instance
             */
            WxLoginResponse.prototype.refreshToken = "";

            /**
             * WxLoginResponse needBindPhone.
             * @member {boolean} needBindPhone
             * @memberof xunxian.auth.WxLoginResponse
             * @instance
             */
            WxLoginResponse.prototype.needBindPhone = false;

            /**
             * WxLoginResponse openid.
             * @member {string} openid
             * @memberof xunxian.auth.WxLoginResponse
             * @instance
             */
            WxLoginResponse.prototype.openid = "";

            /**
             * WxLoginResponse hasCharacter.
             * @member {boolean} hasCharacter
             * @memberof xunxian.auth.WxLoginResponse
             * @instance
             */
            WxLoginResponse.prototype.hasCharacter = false;

            /**
             * WxLoginResponse playerInfo.
             * @member {xunxian.auth.IPlayerBrief|null|undefined} playerInfo
             * @memberof xunxian.auth.WxLoginResponse
             * @instance
             */
            WxLoginResponse.prototype.playerInfo = null;

            /**
             * Creates a new WxLoginResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.WxLoginResponse
             * @static
             * @param {xunxian.auth.IWxLoginResponse=} [properties] Properties to set
             * @returns {xunxian.auth.WxLoginResponse} WxLoginResponse instance
             */
            WxLoginResponse.create = function create(properties) {
                return new WxLoginResponse(properties);
            };

            /**
             * Encodes the specified WxLoginResponse message. Does not implicitly {@link xunxian.auth.WxLoginResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.WxLoginResponse
             * @static
             * @param {xunxian.auth.IWxLoginResponse} message WxLoginResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            WxLoginResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.token);
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.refreshToken);
                if (message.needBindPhone != null && Object.hasOwnProperty.call(message, "needBindPhone"))
                    writer.uint32(/* id 5, wireType 0 =*/40).bool(message.needBindPhone);
                if (message.openid != null && Object.hasOwnProperty.call(message, "openid"))
                    writer.uint32(/* id 6, wireType 2 =*/50).string(message.openid);
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    writer.uint32(/* id 7, wireType 0 =*/56).bool(message.hasCharacter);
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo"))
                    $root.xunxian.auth.PlayerBrief.encode(message.playerInfo, writer.uint32(/* id 8, wireType 2 =*/66).fork(), q + 1).ldelim();
                return writer;
            };

            /**
             * Encodes the specified WxLoginResponse message, length delimited. Does not implicitly {@link xunxian.auth.WxLoginResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.WxLoginResponse
             * @static
             * @param {xunxian.auth.IWxLoginResponse} message WxLoginResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            WxLoginResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a WxLoginResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.WxLoginResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.WxLoginResponse} WxLoginResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            WxLoginResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.WxLoginResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.token = reader.string();
                            break;
                        }
                    case 4: {
                            message.refreshToken = reader.string();
                            break;
                        }
                    case 5: {
                            message.needBindPhone = reader.bool();
                            break;
                        }
                    case 6: {
                            message.openid = reader.string();
                            break;
                        }
                    case 7: {
                            message.hasCharacter = reader.bool();
                            break;
                        }
                    case 8: {
                            message.playerInfo = $root.xunxian.auth.PlayerBrief.decode(reader, reader.uint32(), undefined, long + 1);
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a WxLoginResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.WxLoginResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.WxLoginResponse} WxLoginResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            WxLoginResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a WxLoginResponse message.
             * @function verify
             * @memberof xunxian.auth.WxLoginResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            WxLoginResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    if (!$util.isString(message.token))
                        return "token: string expected";
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    if (!$util.isString(message.refreshToken))
                        return "refreshToken: string expected";
                if (message.needBindPhone != null && Object.hasOwnProperty.call(message, "needBindPhone"))
                    if (typeof message.needBindPhone !== "boolean")
                        return "needBindPhone: boolean expected";
                if (message.openid != null && Object.hasOwnProperty.call(message, "openid"))
                    if (!$util.isString(message.openid))
                        return "openid: string expected";
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    if (typeof message.hasCharacter !== "boolean")
                        return "hasCharacter: boolean expected";
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo")) {
                    var error = $root.xunxian.auth.PlayerBrief.verify(message.playerInfo, long + 1);
                    if (error)
                        return "playerInfo." + error;
                }
                return null;
            };

            /**
             * Creates a WxLoginResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.WxLoginResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.WxLoginResponse} WxLoginResponse
             */
            WxLoginResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.WxLoginResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.WxLoginResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.WxLoginResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.token != null)
                    message.token = String(object.token);
                if (object.refreshToken != null)
                    message.refreshToken = String(object.refreshToken);
                if (object.needBindPhone != null)
                    message.needBindPhone = Boolean(object.needBindPhone);
                if (object.openid != null)
                    message.openid = String(object.openid);
                if (object.hasCharacter != null)
                    message.hasCharacter = Boolean(object.hasCharacter);
                if (object.playerInfo != null) {
                    if (!$util.isObject(object.playerInfo))
                        throw TypeError(".xunxian.auth.WxLoginResponse.playerInfo: object expected");
                    message.playerInfo = $root.xunxian.auth.PlayerBrief.fromObject(object.playerInfo, long + 1);
                }
                return message;
            };

            /**
             * Creates a plain object from a WxLoginResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.WxLoginResponse
             * @static
             * @param {xunxian.auth.WxLoginResponse} message WxLoginResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            WxLoginResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.token = "";
                    object.refreshToken = "";
                    object.needBindPhone = false;
                    object.openid = "";
                    object.hasCharacter = false;
                    object.playerInfo = null;
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    object.token = message.token;
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    object.refreshToken = message.refreshToken;
                if (message.needBindPhone != null && Object.hasOwnProperty.call(message, "needBindPhone"))
                    object.needBindPhone = message.needBindPhone;
                if (message.openid != null && Object.hasOwnProperty.call(message, "openid"))
                    object.openid = message.openid;
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    object.hasCharacter = message.hasCharacter;
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo"))
                    object.playerInfo = $root.xunxian.auth.PlayerBrief.toObject(message.playerInfo, options, q + 1);
                return object;
            };

            /**
             * Converts this WxLoginResponse to JSON.
             * @function toJSON
             * @memberof xunxian.auth.WxLoginResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            WxLoginResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for WxLoginResponse
             * @function getTypeUrl
             * @memberof xunxian.auth.WxLoginResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            WxLoginResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.WxLoginResponse";
            };

            return WxLoginResponse;
        })();

        auth.TtLoginRequest = (function() {

            /**
             * Properties of a TtLoginRequest.
             * @memberof xunxian.auth
             * @interface ITtLoginRequest
             * @property {string|null} [code] TtLoginRequest code
             * @property {string|null} [deviceId] TtLoginRequest deviceId
             */

            /**
             * Constructs a new TtLoginRequest.
             * @memberof xunxian.auth
             * @classdesc Represents a TtLoginRequest.
             * @implements ITtLoginRequest
             * @constructor
             * @param {xunxian.auth.ITtLoginRequest=} [properties] Properties to set
             */
            function TtLoginRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * TtLoginRequest code.
             * @member {string} code
             * @memberof xunxian.auth.TtLoginRequest
             * @instance
             */
            TtLoginRequest.prototype.code = "";

            /**
             * TtLoginRequest deviceId.
             * @member {string} deviceId
             * @memberof xunxian.auth.TtLoginRequest
             * @instance
             */
            TtLoginRequest.prototype.deviceId = "";

            /**
             * Creates a new TtLoginRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.TtLoginRequest
             * @static
             * @param {xunxian.auth.ITtLoginRequest=} [properties] Properties to set
             * @returns {xunxian.auth.TtLoginRequest} TtLoginRequest instance
             */
            TtLoginRequest.create = function create(properties) {
                return new TtLoginRequest(properties);
            };

            /**
             * Encodes the specified TtLoginRequest message. Does not implicitly {@link xunxian.auth.TtLoginRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.TtLoginRequest
             * @static
             * @param {xunxian.auth.ITtLoginRequest} message TtLoginRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            TtLoginRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.code);
                if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.deviceId);
                return writer;
            };

            /**
             * Encodes the specified TtLoginRequest message, length delimited. Does not implicitly {@link xunxian.auth.TtLoginRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.TtLoginRequest
             * @static
             * @param {xunxian.auth.ITtLoginRequest} message TtLoginRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            TtLoginRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a TtLoginRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.TtLoginRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.TtLoginRequest} TtLoginRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            TtLoginRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.TtLoginRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.string();
                            break;
                        }
                    case 2: {
                            message.deviceId = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a TtLoginRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.TtLoginRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.TtLoginRequest} TtLoginRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            TtLoginRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a TtLoginRequest message.
             * @function verify
             * @memberof xunxian.auth.TtLoginRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            TtLoginRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isString(message.code))
                        return "code: string expected";
                if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                    if (!$util.isString(message.deviceId))
                        return "deviceId: string expected";
                return null;
            };

            /**
             * Creates a TtLoginRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.TtLoginRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.TtLoginRequest} TtLoginRequest
             */
            TtLoginRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.TtLoginRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.TtLoginRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.TtLoginRequest();
                if (object.code != null)
                    message.code = String(object.code);
                if (object.deviceId != null)
                    message.deviceId = String(object.deviceId);
                return message;
            };

            /**
             * Creates a plain object from a TtLoginRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.TtLoginRequest
             * @static
             * @param {xunxian.auth.TtLoginRequest} message TtLoginRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            TtLoginRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = "";
                    object.deviceId = "";
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                    object.deviceId = message.deviceId;
                return object;
            };

            /**
             * Converts this TtLoginRequest to JSON.
             * @function toJSON
             * @memberof xunxian.auth.TtLoginRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            TtLoginRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for TtLoginRequest
             * @function getTypeUrl
             * @memberof xunxian.auth.TtLoginRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            TtLoginRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.TtLoginRequest";
            };

            return TtLoginRequest;
        })();

        auth.TtLoginResponse = (function() {

            /**
             * Properties of a TtLoginResponse.
             * @memberof xunxian.auth
             * @interface ITtLoginResponse
             * @property {number|null} [code] TtLoginResponse code
             * @property {string|null} [msg] TtLoginResponse msg
             * @property {string|null} [token] TtLoginResponse token
             * @property {string|null} [refreshToken] TtLoginResponse refreshToken
             * @property {boolean|null} [needBindPhone] TtLoginResponse needBindPhone
             * @property {string|null} [openid] TtLoginResponse openid
             * @property {boolean|null} [hasCharacter] TtLoginResponse hasCharacter
             * @property {boolean|null} [needConfirm] TtLoginResponse needConfirm
             * @property {xunxian.auth.IPlayerBrief|null} [playerInfo] TtLoginResponse playerInfo
             */

            /**
             * Constructs a new TtLoginResponse.
             * @memberof xunxian.auth
             * @classdesc Represents a TtLoginResponse.
             * @implements ITtLoginResponse
             * @constructor
             * @param {xunxian.auth.ITtLoginResponse=} [properties] Properties to set
             */
            function TtLoginResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * TtLoginResponse code.
             * @member {number} code
             * @memberof xunxian.auth.TtLoginResponse
             * @instance
             */
            TtLoginResponse.prototype.code = 0;

            /**
             * TtLoginResponse msg.
             * @member {string} msg
             * @memberof xunxian.auth.TtLoginResponse
             * @instance
             */
            TtLoginResponse.prototype.msg = "";

            /**
             * TtLoginResponse token.
             * @member {string} token
             * @memberof xunxian.auth.TtLoginResponse
             * @instance
             */
            TtLoginResponse.prototype.token = "";

            /**
             * TtLoginResponse refreshToken.
             * @member {string} refreshToken
             * @memberof xunxian.auth.TtLoginResponse
             * @instance
             */
            TtLoginResponse.prototype.refreshToken = "";

            /**
             * TtLoginResponse needBindPhone.
             * @member {boolean} needBindPhone
             * @memberof xunxian.auth.TtLoginResponse
             * @instance
             */
            TtLoginResponse.prototype.needBindPhone = false;

            /**
             * TtLoginResponse openid.
             * @member {string} openid
             * @memberof xunxian.auth.TtLoginResponse
             * @instance
             */
            TtLoginResponse.prototype.openid = "";

            /**
             * TtLoginResponse hasCharacter.
             * @member {boolean} hasCharacter
             * @memberof xunxian.auth.TtLoginResponse
             * @instance
             */
            TtLoginResponse.prototype.hasCharacter = false;

            /**
             * TtLoginResponse needConfirm.
             * @member {boolean} needConfirm
             * @memberof xunxian.auth.TtLoginResponse
             * @instance
             */
            TtLoginResponse.prototype.needConfirm = false;

            /**
             * TtLoginResponse playerInfo.
             * @member {xunxian.auth.IPlayerBrief|null|undefined} playerInfo
             * @memberof xunxian.auth.TtLoginResponse
             * @instance
             */
            TtLoginResponse.prototype.playerInfo = null;

            /**
             * Creates a new TtLoginResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.TtLoginResponse
             * @static
             * @param {xunxian.auth.ITtLoginResponse=} [properties] Properties to set
             * @returns {xunxian.auth.TtLoginResponse} TtLoginResponse instance
             */
            TtLoginResponse.create = function create(properties) {
                return new TtLoginResponse(properties);
            };

            /**
             * Encodes the specified TtLoginResponse message. Does not implicitly {@link xunxian.auth.TtLoginResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.TtLoginResponse
             * @static
             * @param {xunxian.auth.ITtLoginResponse} message TtLoginResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            TtLoginResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.token);
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.refreshToken);
                if (message.needBindPhone != null && Object.hasOwnProperty.call(message, "needBindPhone"))
                    writer.uint32(/* id 5, wireType 0 =*/40).bool(message.needBindPhone);
                if (message.openid != null && Object.hasOwnProperty.call(message, "openid"))
                    writer.uint32(/* id 6, wireType 2 =*/50).string(message.openid);
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    writer.uint32(/* id 7, wireType 0 =*/56).bool(message.hasCharacter);
                if (message.needConfirm != null && Object.hasOwnProperty.call(message, "needConfirm"))
                    writer.uint32(/* id 8, wireType 0 =*/64).bool(message.needConfirm);
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo"))
                    $root.xunxian.auth.PlayerBrief.encode(message.playerInfo, writer.uint32(/* id 9, wireType 2 =*/74).fork(), q + 1).ldelim();
                return writer;
            };

            /**
             * Encodes the specified TtLoginResponse message, length delimited. Does not implicitly {@link xunxian.auth.TtLoginResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.TtLoginResponse
             * @static
             * @param {xunxian.auth.ITtLoginResponse} message TtLoginResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            TtLoginResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a TtLoginResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.TtLoginResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.TtLoginResponse} TtLoginResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            TtLoginResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.TtLoginResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.token = reader.string();
                            break;
                        }
                    case 4: {
                            message.refreshToken = reader.string();
                            break;
                        }
                    case 5: {
                            message.needBindPhone = reader.bool();
                            break;
                        }
                    case 6: {
                            message.openid = reader.string();
                            break;
                        }
                    case 7: {
                            message.hasCharacter = reader.bool();
                            break;
                        }
                    case 8: {
                            message.needConfirm = reader.bool();
                            break;
                        }
                    case 9: {
                            message.playerInfo = $root.xunxian.auth.PlayerBrief.decode(reader, reader.uint32(), undefined, long + 1);
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a TtLoginResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.TtLoginResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.TtLoginResponse} TtLoginResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            TtLoginResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a TtLoginResponse message.
             * @function verify
             * @memberof xunxian.auth.TtLoginResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            TtLoginResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    if (!$util.isString(message.token))
                        return "token: string expected";
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    if (!$util.isString(message.refreshToken))
                        return "refreshToken: string expected";
                if (message.needBindPhone != null && Object.hasOwnProperty.call(message, "needBindPhone"))
                    if (typeof message.needBindPhone !== "boolean")
                        return "needBindPhone: boolean expected";
                if (message.openid != null && Object.hasOwnProperty.call(message, "openid"))
                    if (!$util.isString(message.openid))
                        return "openid: string expected";
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    if (typeof message.hasCharacter !== "boolean")
                        return "hasCharacter: boolean expected";
                if (message.needConfirm != null && Object.hasOwnProperty.call(message, "needConfirm"))
                    if (typeof message.needConfirm !== "boolean")
                        return "needConfirm: boolean expected";
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo")) {
                    var error = $root.xunxian.auth.PlayerBrief.verify(message.playerInfo, long + 1);
                    if (error)
                        return "playerInfo." + error;
                }
                return null;
            };

            /**
             * Creates a TtLoginResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.TtLoginResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.TtLoginResponse} TtLoginResponse
             */
            TtLoginResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.TtLoginResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.TtLoginResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.TtLoginResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.token != null)
                    message.token = String(object.token);
                if (object.refreshToken != null)
                    message.refreshToken = String(object.refreshToken);
                if (object.needBindPhone != null)
                    message.needBindPhone = Boolean(object.needBindPhone);
                if (object.openid != null)
                    message.openid = String(object.openid);
                if (object.hasCharacter != null)
                    message.hasCharacter = Boolean(object.hasCharacter);
                if (object.needConfirm != null)
                    message.needConfirm = Boolean(object.needConfirm);
                if (object.playerInfo != null) {
                    if (!$util.isObject(object.playerInfo))
                        throw TypeError(".xunxian.auth.TtLoginResponse.playerInfo: object expected");
                    message.playerInfo = $root.xunxian.auth.PlayerBrief.fromObject(object.playerInfo, long + 1);
                }
                return message;
            };

            /**
             * Creates a plain object from a TtLoginResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.TtLoginResponse
             * @static
             * @param {xunxian.auth.TtLoginResponse} message TtLoginResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            TtLoginResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.token = "";
                    object.refreshToken = "";
                    object.needBindPhone = false;
                    object.openid = "";
                    object.hasCharacter = false;
                    object.needConfirm = false;
                    object.playerInfo = null;
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    object.token = message.token;
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    object.refreshToken = message.refreshToken;
                if (message.needBindPhone != null && Object.hasOwnProperty.call(message, "needBindPhone"))
                    object.needBindPhone = message.needBindPhone;
                if (message.openid != null && Object.hasOwnProperty.call(message, "openid"))
                    object.openid = message.openid;
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    object.hasCharacter = message.hasCharacter;
                if (message.needConfirm != null && Object.hasOwnProperty.call(message, "needConfirm"))
                    object.needConfirm = message.needConfirm;
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo"))
                    object.playerInfo = $root.xunxian.auth.PlayerBrief.toObject(message.playerInfo, options, q + 1);
                return object;
            };

            /**
             * Converts this TtLoginResponse to JSON.
             * @function toJSON
             * @memberof xunxian.auth.TtLoginResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            TtLoginResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for TtLoginResponse
             * @function getTypeUrl
             * @memberof xunxian.auth.TtLoginResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            TtLoginResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.TtLoginResponse";
            };

            return TtLoginResponse;
        })();

        auth.PhoneLoginRequest = (function() {

            /**
             * Properties of a PhoneLoginRequest.
             * @memberof xunxian.auth
             * @interface IPhoneLoginRequest
             * @property {string|null} [phone] PhoneLoginRequest phone
             * @property {string|null} [code] PhoneLoginRequest code
             * @property {string|null} [deviceId] PhoneLoginRequest deviceId
             */

            /**
             * Constructs a new PhoneLoginRequest.
             * @memberof xunxian.auth
             * @classdesc Represents a PhoneLoginRequest.
             * @implements IPhoneLoginRequest
             * @constructor
             * @param {xunxian.auth.IPhoneLoginRequest=} [properties] Properties to set
             */
            function PhoneLoginRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * PhoneLoginRequest phone.
             * @member {string} phone
             * @memberof xunxian.auth.PhoneLoginRequest
             * @instance
             */
            PhoneLoginRequest.prototype.phone = "";

            /**
             * PhoneLoginRequest code.
             * @member {string} code
             * @memberof xunxian.auth.PhoneLoginRequest
             * @instance
             */
            PhoneLoginRequest.prototype.code = "";

            /**
             * PhoneLoginRequest deviceId.
             * @member {string} deviceId
             * @memberof xunxian.auth.PhoneLoginRequest
             * @instance
             */
            PhoneLoginRequest.prototype.deviceId = "";

            /**
             * Creates a new PhoneLoginRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.PhoneLoginRequest
             * @static
             * @param {xunxian.auth.IPhoneLoginRequest=} [properties] Properties to set
             * @returns {xunxian.auth.PhoneLoginRequest} PhoneLoginRequest instance
             */
            PhoneLoginRequest.create = function create(properties) {
                return new PhoneLoginRequest(properties);
            };

            /**
             * Encodes the specified PhoneLoginRequest message. Does not implicitly {@link xunxian.auth.PhoneLoginRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.PhoneLoginRequest
             * @static
             * @param {xunxian.auth.IPhoneLoginRequest} message PhoneLoginRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PhoneLoginRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.phone != null && Object.hasOwnProperty.call(message, "phone"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.phone);
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.code);
                if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.deviceId);
                return writer;
            };

            /**
             * Encodes the specified PhoneLoginRequest message, length delimited. Does not implicitly {@link xunxian.auth.PhoneLoginRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.PhoneLoginRequest
             * @static
             * @param {xunxian.auth.IPhoneLoginRequest} message PhoneLoginRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PhoneLoginRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a PhoneLoginRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.PhoneLoginRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.PhoneLoginRequest} PhoneLoginRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PhoneLoginRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.PhoneLoginRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.phone = reader.string();
                            break;
                        }
                    case 2: {
                            message.code = reader.string();
                            break;
                        }
                    case 3: {
                            message.deviceId = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a PhoneLoginRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.PhoneLoginRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.PhoneLoginRequest} PhoneLoginRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PhoneLoginRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a PhoneLoginRequest message.
             * @function verify
             * @memberof xunxian.auth.PhoneLoginRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            PhoneLoginRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.phone != null && Object.hasOwnProperty.call(message, "phone"))
                    if (!$util.isString(message.phone))
                        return "phone: string expected";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isString(message.code))
                        return "code: string expected";
                if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                    if (!$util.isString(message.deviceId))
                        return "deviceId: string expected";
                return null;
            };

            /**
             * Creates a PhoneLoginRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.PhoneLoginRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.PhoneLoginRequest} PhoneLoginRequest
             */
            PhoneLoginRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.PhoneLoginRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.PhoneLoginRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.PhoneLoginRequest();
                if (object.phone != null)
                    message.phone = String(object.phone);
                if (object.code != null)
                    message.code = String(object.code);
                if (object.deviceId != null)
                    message.deviceId = String(object.deviceId);
                return message;
            };

            /**
             * Creates a plain object from a PhoneLoginRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.PhoneLoginRequest
             * @static
             * @param {xunxian.auth.PhoneLoginRequest} message PhoneLoginRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            PhoneLoginRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.phone = "";
                    object.code = "";
                    object.deviceId = "";
                }
                if (message.phone != null && Object.hasOwnProperty.call(message, "phone"))
                    object.phone = message.phone;
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                    object.deviceId = message.deviceId;
                return object;
            };

            /**
             * Converts this PhoneLoginRequest to JSON.
             * @function toJSON
             * @memberof xunxian.auth.PhoneLoginRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            PhoneLoginRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for PhoneLoginRequest
             * @function getTypeUrl
             * @memberof xunxian.auth.PhoneLoginRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            PhoneLoginRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.PhoneLoginRequest";
            };

            return PhoneLoginRequest;
        })();

        auth.PhoneLoginResponse = (function() {

            /**
             * Properties of a PhoneLoginResponse.
             * @memberof xunxian.auth
             * @interface IPhoneLoginResponse
             * @property {number|null} [code] PhoneLoginResponse code
             * @property {string|null} [msg] PhoneLoginResponse msg
             * @property {string|null} [token] PhoneLoginResponse token
             * @property {string|null} [refreshToken] PhoneLoginResponse refreshToken
             * @property {boolean|null} [hasCharacter] PhoneLoginResponse hasCharacter
             * @property {xunxian.auth.IPlayerBrief|null} [playerInfo] PhoneLoginResponse playerInfo
             */

            /**
             * Constructs a new PhoneLoginResponse.
             * @memberof xunxian.auth
             * @classdesc Represents a PhoneLoginResponse.
             * @implements IPhoneLoginResponse
             * @constructor
             * @param {xunxian.auth.IPhoneLoginResponse=} [properties] Properties to set
             */
            function PhoneLoginResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * PhoneLoginResponse code.
             * @member {number} code
             * @memberof xunxian.auth.PhoneLoginResponse
             * @instance
             */
            PhoneLoginResponse.prototype.code = 0;

            /**
             * PhoneLoginResponse msg.
             * @member {string} msg
             * @memberof xunxian.auth.PhoneLoginResponse
             * @instance
             */
            PhoneLoginResponse.prototype.msg = "";

            /**
             * PhoneLoginResponse token.
             * @member {string} token
             * @memberof xunxian.auth.PhoneLoginResponse
             * @instance
             */
            PhoneLoginResponse.prototype.token = "";

            /**
             * PhoneLoginResponse refreshToken.
             * @member {string} refreshToken
             * @memberof xunxian.auth.PhoneLoginResponse
             * @instance
             */
            PhoneLoginResponse.prototype.refreshToken = "";

            /**
             * PhoneLoginResponse hasCharacter.
             * @member {boolean} hasCharacter
             * @memberof xunxian.auth.PhoneLoginResponse
             * @instance
             */
            PhoneLoginResponse.prototype.hasCharacter = false;

            /**
             * PhoneLoginResponse playerInfo.
             * @member {xunxian.auth.IPlayerBrief|null|undefined} playerInfo
             * @memberof xunxian.auth.PhoneLoginResponse
             * @instance
             */
            PhoneLoginResponse.prototype.playerInfo = null;

            /**
             * Creates a new PhoneLoginResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.PhoneLoginResponse
             * @static
             * @param {xunxian.auth.IPhoneLoginResponse=} [properties] Properties to set
             * @returns {xunxian.auth.PhoneLoginResponse} PhoneLoginResponse instance
             */
            PhoneLoginResponse.create = function create(properties) {
                return new PhoneLoginResponse(properties);
            };

            /**
             * Encodes the specified PhoneLoginResponse message. Does not implicitly {@link xunxian.auth.PhoneLoginResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.PhoneLoginResponse
             * @static
             * @param {xunxian.auth.IPhoneLoginResponse} message PhoneLoginResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PhoneLoginResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.token);
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.refreshToken);
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    writer.uint32(/* id 5, wireType 0 =*/40).bool(message.hasCharacter);
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo"))
                    $root.xunxian.auth.PlayerBrief.encode(message.playerInfo, writer.uint32(/* id 6, wireType 2 =*/50).fork(), q + 1).ldelim();
                return writer;
            };

            /**
             * Encodes the specified PhoneLoginResponse message, length delimited. Does not implicitly {@link xunxian.auth.PhoneLoginResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.PhoneLoginResponse
             * @static
             * @param {xunxian.auth.IPhoneLoginResponse} message PhoneLoginResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PhoneLoginResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a PhoneLoginResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.PhoneLoginResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.PhoneLoginResponse} PhoneLoginResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PhoneLoginResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.PhoneLoginResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.token = reader.string();
                            break;
                        }
                    case 4: {
                            message.refreshToken = reader.string();
                            break;
                        }
                    case 5: {
                            message.hasCharacter = reader.bool();
                            break;
                        }
                    case 6: {
                            message.playerInfo = $root.xunxian.auth.PlayerBrief.decode(reader, reader.uint32(), undefined, long + 1);
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a PhoneLoginResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.PhoneLoginResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.PhoneLoginResponse} PhoneLoginResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PhoneLoginResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a PhoneLoginResponse message.
             * @function verify
             * @memberof xunxian.auth.PhoneLoginResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            PhoneLoginResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    if (!$util.isString(message.token))
                        return "token: string expected";
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    if (!$util.isString(message.refreshToken))
                        return "refreshToken: string expected";
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    if (typeof message.hasCharacter !== "boolean")
                        return "hasCharacter: boolean expected";
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo")) {
                    var error = $root.xunxian.auth.PlayerBrief.verify(message.playerInfo, long + 1);
                    if (error)
                        return "playerInfo." + error;
                }
                return null;
            };

            /**
             * Creates a PhoneLoginResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.PhoneLoginResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.PhoneLoginResponse} PhoneLoginResponse
             */
            PhoneLoginResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.PhoneLoginResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.PhoneLoginResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.PhoneLoginResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.token != null)
                    message.token = String(object.token);
                if (object.refreshToken != null)
                    message.refreshToken = String(object.refreshToken);
                if (object.hasCharacter != null)
                    message.hasCharacter = Boolean(object.hasCharacter);
                if (object.playerInfo != null) {
                    if (!$util.isObject(object.playerInfo))
                        throw TypeError(".xunxian.auth.PhoneLoginResponse.playerInfo: object expected");
                    message.playerInfo = $root.xunxian.auth.PlayerBrief.fromObject(object.playerInfo, long + 1);
                }
                return message;
            };

            /**
             * Creates a plain object from a PhoneLoginResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.PhoneLoginResponse
             * @static
             * @param {xunxian.auth.PhoneLoginResponse} message PhoneLoginResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            PhoneLoginResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.token = "";
                    object.refreshToken = "";
                    object.hasCharacter = false;
                    object.playerInfo = null;
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    object.token = message.token;
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    object.refreshToken = message.refreshToken;
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    object.hasCharacter = message.hasCharacter;
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo"))
                    object.playerInfo = $root.xunxian.auth.PlayerBrief.toObject(message.playerInfo, options, q + 1);
                return object;
            };

            /**
             * Converts this PhoneLoginResponse to JSON.
             * @function toJSON
             * @memberof xunxian.auth.PhoneLoginResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            PhoneLoginResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for PhoneLoginResponse
             * @function getTypeUrl
             * @memberof xunxian.auth.PhoneLoginResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            PhoneLoginResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.PhoneLoginResponse";
            };

            return PhoneLoginResponse;
        })();

        auth.SendCodeRequest = (function() {

            /**
             * Properties of a SendCodeRequest.
             * @memberof xunxian.auth
             * @interface ISendCodeRequest
             * @property {string|null} [phone] SendCodeRequest phone
             * @property {string|null} [purpose] SendCodeRequest purpose
             */

            /**
             * Constructs a new SendCodeRequest.
             * @memberof xunxian.auth
             * @classdesc Represents a SendCodeRequest.
             * @implements ISendCodeRequest
             * @constructor
             * @param {xunxian.auth.ISendCodeRequest=} [properties] Properties to set
             */
            function SendCodeRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * SendCodeRequest phone.
             * @member {string} phone
             * @memberof xunxian.auth.SendCodeRequest
             * @instance
             */
            SendCodeRequest.prototype.phone = "";

            /**
             * SendCodeRequest purpose.
             * @member {string} purpose
             * @memberof xunxian.auth.SendCodeRequest
             * @instance
             */
            SendCodeRequest.prototype.purpose = "";

            /**
             * Creates a new SendCodeRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.SendCodeRequest
             * @static
             * @param {xunxian.auth.ISendCodeRequest=} [properties] Properties to set
             * @returns {xunxian.auth.SendCodeRequest} SendCodeRequest instance
             */
            SendCodeRequest.create = function create(properties) {
                return new SendCodeRequest(properties);
            };

            /**
             * Encodes the specified SendCodeRequest message. Does not implicitly {@link xunxian.auth.SendCodeRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.SendCodeRequest
             * @static
             * @param {xunxian.auth.ISendCodeRequest} message SendCodeRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SendCodeRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.phone != null && Object.hasOwnProperty.call(message, "phone"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.phone);
                if (message.purpose != null && Object.hasOwnProperty.call(message, "purpose"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.purpose);
                return writer;
            };

            /**
             * Encodes the specified SendCodeRequest message, length delimited. Does not implicitly {@link xunxian.auth.SendCodeRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.SendCodeRequest
             * @static
             * @param {xunxian.auth.ISendCodeRequest} message SendCodeRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SendCodeRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a SendCodeRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.SendCodeRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.SendCodeRequest} SendCodeRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SendCodeRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.SendCodeRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.phone = reader.string();
                            break;
                        }
                    case 2: {
                            message.purpose = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a SendCodeRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.SendCodeRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.SendCodeRequest} SendCodeRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SendCodeRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SendCodeRequest message.
             * @function verify
             * @memberof xunxian.auth.SendCodeRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SendCodeRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.phone != null && Object.hasOwnProperty.call(message, "phone"))
                    if (!$util.isString(message.phone))
                        return "phone: string expected";
                if (message.purpose != null && Object.hasOwnProperty.call(message, "purpose"))
                    if (!$util.isString(message.purpose))
                        return "purpose: string expected";
                return null;
            };

            /**
             * Creates a SendCodeRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.SendCodeRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.SendCodeRequest} SendCodeRequest
             */
            SendCodeRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.SendCodeRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.SendCodeRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.SendCodeRequest();
                if (object.phone != null)
                    message.phone = String(object.phone);
                if (object.purpose != null)
                    message.purpose = String(object.purpose);
                return message;
            };

            /**
             * Creates a plain object from a SendCodeRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.SendCodeRequest
             * @static
             * @param {xunxian.auth.SendCodeRequest} message SendCodeRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SendCodeRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.phone = "";
                    object.purpose = "";
                }
                if (message.phone != null && Object.hasOwnProperty.call(message, "phone"))
                    object.phone = message.phone;
                if (message.purpose != null && Object.hasOwnProperty.call(message, "purpose"))
                    object.purpose = message.purpose;
                return object;
            };

            /**
             * Converts this SendCodeRequest to JSON.
             * @function toJSON
             * @memberof xunxian.auth.SendCodeRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SendCodeRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SendCodeRequest
             * @function getTypeUrl
             * @memberof xunxian.auth.SendCodeRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SendCodeRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.SendCodeRequest";
            };

            return SendCodeRequest;
        })();

        auth.SendCodeResponse = (function() {

            /**
             * Properties of a SendCodeResponse.
             * @memberof xunxian.auth
             * @interface ISendCodeResponse
             * @property {number|null} [code] SendCodeResponse code
             * @property {string|null} [msg] SendCodeResponse msg
             * @property {boolean|null} [success] SendCodeResponse success
             */

            /**
             * Constructs a new SendCodeResponse.
             * @memberof xunxian.auth
             * @classdesc Represents a SendCodeResponse.
             * @implements ISendCodeResponse
             * @constructor
             * @param {xunxian.auth.ISendCodeResponse=} [properties] Properties to set
             */
            function SendCodeResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * SendCodeResponse code.
             * @member {number} code
             * @memberof xunxian.auth.SendCodeResponse
             * @instance
             */
            SendCodeResponse.prototype.code = 0;

            /**
             * SendCodeResponse msg.
             * @member {string} msg
             * @memberof xunxian.auth.SendCodeResponse
             * @instance
             */
            SendCodeResponse.prototype.msg = "";

            /**
             * SendCodeResponse success.
             * @member {boolean} success
             * @memberof xunxian.auth.SendCodeResponse
             * @instance
             */
            SendCodeResponse.prototype.success = false;

            /**
             * Creates a new SendCodeResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.SendCodeResponse
             * @static
             * @param {xunxian.auth.ISendCodeResponse=} [properties] Properties to set
             * @returns {xunxian.auth.SendCodeResponse} SendCodeResponse instance
             */
            SendCodeResponse.create = function create(properties) {
                return new SendCodeResponse(properties);
            };

            /**
             * Encodes the specified SendCodeResponse message. Does not implicitly {@link xunxian.auth.SendCodeResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.SendCodeResponse
             * @static
             * @param {xunxian.auth.ISendCodeResponse} message SendCodeResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SendCodeResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.success != null && Object.hasOwnProperty.call(message, "success"))
                    writer.uint32(/* id 3, wireType 0 =*/24).bool(message.success);
                return writer;
            };

            /**
             * Encodes the specified SendCodeResponse message, length delimited. Does not implicitly {@link xunxian.auth.SendCodeResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.SendCodeResponse
             * @static
             * @param {xunxian.auth.ISendCodeResponse} message SendCodeResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SendCodeResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a SendCodeResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.SendCodeResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.SendCodeResponse} SendCodeResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SendCodeResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.SendCodeResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.success = reader.bool();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a SendCodeResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.SendCodeResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.SendCodeResponse} SendCodeResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SendCodeResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SendCodeResponse message.
             * @function verify
             * @memberof xunxian.auth.SendCodeResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SendCodeResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.success != null && Object.hasOwnProperty.call(message, "success"))
                    if (typeof message.success !== "boolean")
                        return "success: boolean expected";
                return null;
            };

            /**
             * Creates a SendCodeResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.SendCodeResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.SendCodeResponse} SendCodeResponse
             */
            SendCodeResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.SendCodeResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.SendCodeResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.SendCodeResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.success != null)
                    message.success = Boolean(object.success);
                return message;
            };

            /**
             * Creates a plain object from a SendCodeResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.SendCodeResponse
             * @static
             * @param {xunxian.auth.SendCodeResponse} message SendCodeResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SendCodeResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.success = false;
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.success != null && Object.hasOwnProperty.call(message, "success"))
                    object.success = message.success;
                return object;
            };

            /**
             * Converts this SendCodeResponse to JSON.
             * @function toJSON
             * @memberof xunxian.auth.SendCodeResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SendCodeResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SendCodeResponse
             * @function getTypeUrl
             * @memberof xunxian.auth.SendCodeResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SendCodeResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.SendCodeResponse";
            };

            return SendCodeResponse;
        })();

        auth.BindPhoneRequest = (function() {

            /**
             * Properties of a BindPhoneRequest.
             * @memberof xunxian.auth
             * @interface IBindPhoneRequest
             * @property {string|null} [openid] BindPhoneRequest openid
             * @property {string|null} [platform] BindPhoneRequest platform
             * @property {string|null} [phone] BindPhoneRequest phone
             * @property {string|null} [code] BindPhoneRequest code
             */

            /**
             * Constructs a new BindPhoneRequest.
             * @memberof xunxian.auth
             * @classdesc Represents a BindPhoneRequest.
             * @implements IBindPhoneRequest
             * @constructor
             * @param {xunxian.auth.IBindPhoneRequest=} [properties] Properties to set
             */
            function BindPhoneRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * BindPhoneRequest openid.
             * @member {string} openid
             * @memberof xunxian.auth.BindPhoneRequest
             * @instance
             */
            BindPhoneRequest.prototype.openid = "";

            /**
             * BindPhoneRequest platform.
             * @member {string} platform
             * @memberof xunxian.auth.BindPhoneRequest
             * @instance
             */
            BindPhoneRequest.prototype.platform = "";

            /**
             * BindPhoneRequest phone.
             * @member {string} phone
             * @memberof xunxian.auth.BindPhoneRequest
             * @instance
             */
            BindPhoneRequest.prototype.phone = "";

            /**
             * BindPhoneRequest code.
             * @member {string} code
             * @memberof xunxian.auth.BindPhoneRequest
             * @instance
             */
            BindPhoneRequest.prototype.code = "";

            /**
             * Creates a new BindPhoneRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.BindPhoneRequest
             * @static
             * @param {xunxian.auth.IBindPhoneRequest=} [properties] Properties to set
             * @returns {xunxian.auth.BindPhoneRequest} BindPhoneRequest instance
             */
            BindPhoneRequest.create = function create(properties) {
                return new BindPhoneRequest(properties);
            };

            /**
             * Encodes the specified BindPhoneRequest message. Does not implicitly {@link xunxian.auth.BindPhoneRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.BindPhoneRequest
             * @static
             * @param {xunxian.auth.IBindPhoneRequest} message BindPhoneRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BindPhoneRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.openid != null && Object.hasOwnProperty.call(message, "openid"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.openid);
                if (message.platform != null && Object.hasOwnProperty.call(message, "platform"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.platform);
                if (message.phone != null && Object.hasOwnProperty.call(message, "phone"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.phone);
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.code);
                return writer;
            };

            /**
             * Encodes the specified BindPhoneRequest message, length delimited. Does not implicitly {@link xunxian.auth.BindPhoneRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.BindPhoneRequest
             * @static
             * @param {xunxian.auth.IBindPhoneRequest} message BindPhoneRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BindPhoneRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a BindPhoneRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.BindPhoneRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.BindPhoneRequest} BindPhoneRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BindPhoneRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.BindPhoneRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.openid = reader.string();
                            break;
                        }
                    case 2: {
                            message.platform = reader.string();
                            break;
                        }
                    case 3: {
                            message.phone = reader.string();
                            break;
                        }
                    case 4: {
                            message.code = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a BindPhoneRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.BindPhoneRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.BindPhoneRequest} BindPhoneRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BindPhoneRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a BindPhoneRequest message.
             * @function verify
             * @memberof xunxian.auth.BindPhoneRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            BindPhoneRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.openid != null && Object.hasOwnProperty.call(message, "openid"))
                    if (!$util.isString(message.openid))
                        return "openid: string expected";
                if (message.platform != null && Object.hasOwnProperty.call(message, "platform"))
                    if (!$util.isString(message.platform))
                        return "platform: string expected";
                if (message.phone != null && Object.hasOwnProperty.call(message, "phone"))
                    if (!$util.isString(message.phone))
                        return "phone: string expected";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isString(message.code))
                        return "code: string expected";
                return null;
            };

            /**
             * Creates a BindPhoneRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.BindPhoneRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.BindPhoneRequest} BindPhoneRequest
             */
            BindPhoneRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.BindPhoneRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.BindPhoneRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.BindPhoneRequest();
                if (object.openid != null)
                    message.openid = String(object.openid);
                if (object.platform != null)
                    message.platform = String(object.platform);
                if (object.phone != null)
                    message.phone = String(object.phone);
                if (object.code != null)
                    message.code = String(object.code);
                return message;
            };

            /**
             * Creates a plain object from a BindPhoneRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.BindPhoneRequest
             * @static
             * @param {xunxian.auth.BindPhoneRequest} message BindPhoneRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            BindPhoneRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.openid = "";
                    object.platform = "";
                    object.phone = "";
                    object.code = "";
                }
                if (message.openid != null && Object.hasOwnProperty.call(message, "openid"))
                    object.openid = message.openid;
                if (message.platform != null && Object.hasOwnProperty.call(message, "platform"))
                    object.platform = message.platform;
                if (message.phone != null && Object.hasOwnProperty.call(message, "phone"))
                    object.phone = message.phone;
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                return object;
            };

            /**
             * Converts this BindPhoneRequest to JSON.
             * @function toJSON
             * @memberof xunxian.auth.BindPhoneRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            BindPhoneRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for BindPhoneRequest
             * @function getTypeUrl
             * @memberof xunxian.auth.BindPhoneRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            BindPhoneRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.BindPhoneRequest";
            };

            return BindPhoneRequest;
        })();

        auth.BindPhoneResponse = (function() {

            /**
             * Properties of a BindPhoneResponse.
             * @memberof xunxian.auth
             * @interface IBindPhoneResponse
             * @property {number|null} [code] BindPhoneResponse code
             * @property {string|null} [msg] BindPhoneResponse msg
             * @property {string|null} [token] BindPhoneResponse token
             * @property {string|null} [refreshToken] BindPhoneResponse refreshToken
             * @property {boolean|null} [hasCharacter] BindPhoneResponse hasCharacter
             * @property {boolean|null} [needConfirm] BindPhoneResponse needConfirm
             * @property {xunxian.auth.IPlayerBrief|null} [playerInfo] BindPhoneResponse playerInfo
             */

            /**
             * Constructs a new BindPhoneResponse.
             * @memberof xunxian.auth
             * @classdesc Represents a BindPhoneResponse.
             * @implements IBindPhoneResponse
             * @constructor
             * @param {xunxian.auth.IBindPhoneResponse=} [properties] Properties to set
             */
            function BindPhoneResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * BindPhoneResponse code.
             * @member {number} code
             * @memberof xunxian.auth.BindPhoneResponse
             * @instance
             */
            BindPhoneResponse.prototype.code = 0;

            /**
             * BindPhoneResponse msg.
             * @member {string} msg
             * @memberof xunxian.auth.BindPhoneResponse
             * @instance
             */
            BindPhoneResponse.prototype.msg = "";

            /**
             * BindPhoneResponse token.
             * @member {string} token
             * @memberof xunxian.auth.BindPhoneResponse
             * @instance
             */
            BindPhoneResponse.prototype.token = "";

            /**
             * BindPhoneResponse refreshToken.
             * @member {string} refreshToken
             * @memberof xunxian.auth.BindPhoneResponse
             * @instance
             */
            BindPhoneResponse.prototype.refreshToken = "";

            /**
             * BindPhoneResponse hasCharacter.
             * @member {boolean} hasCharacter
             * @memberof xunxian.auth.BindPhoneResponse
             * @instance
             */
            BindPhoneResponse.prototype.hasCharacter = false;

            /**
             * BindPhoneResponse needConfirm.
             * @member {boolean} needConfirm
             * @memberof xunxian.auth.BindPhoneResponse
             * @instance
             */
            BindPhoneResponse.prototype.needConfirm = false;

            /**
             * BindPhoneResponse playerInfo.
             * @member {xunxian.auth.IPlayerBrief|null|undefined} playerInfo
             * @memberof xunxian.auth.BindPhoneResponse
             * @instance
             */
            BindPhoneResponse.prototype.playerInfo = null;

            /**
             * Creates a new BindPhoneResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.BindPhoneResponse
             * @static
             * @param {xunxian.auth.IBindPhoneResponse=} [properties] Properties to set
             * @returns {xunxian.auth.BindPhoneResponse} BindPhoneResponse instance
             */
            BindPhoneResponse.create = function create(properties) {
                return new BindPhoneResponse(properties);
            };

            /**
             * Encodes the specified BindPhoneResponse message. Does not implicitly {@link xunxian.auth.BindPhoneResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.BindPhoneResponse
             * @static
             * @param {xunxian.auth.IBindPhoneResponse} message BindPhoneResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BindPhoneResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.token);
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.refreshToken);
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    writer.uint32(/* id 5, wireType 0 =*/40).bool(message.hasCharacter);
                if (message.needConfirm != null && Object.hasOwnProperty.call(message, "needConfirm"))
                    writer.uint32(/* id 6, wireType 0 =*/48).bool(message.needConfirm);
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo"))
                    $root.xunxian.auth.PlayerBrief.encode(message.playerInfo, writer.uint32(/* id 7, wireType 2 =*/58).fork(), q + 1).ldelim();
                return writer;
            };

            /**
             * Encodes the specified BindPhoneResponse message, length delimited. Does not implicitly {@link xunxian.auth.BindPhoneResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.BindPhoneResponse
             * @static
             * @param {xunxian.auth.IBindPhoneResponse} message BindPhoneResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            BindPhoneResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a BindPhoneResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.BindPhoneResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.BindPhoneResponse} BindPhoneResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BindPhoneResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.BindPhoneResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.token = reader.string();
                            break;
                        }
                    case 4: {
                            message.refreshToken = reader.string();
                            break;
                        }
                    case 5: {
                            message.hasCharacter = reader.bool();
                            break;
                        }
                    case 6: {
                            message.needConfirm = reader.bool();
                            break;
                        }
                    case 7: {
                            message.playerInfo = $root.xunxian.auth.PlayerBrief.decode(reader, reader.uint32(), undefined, long + 1);
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a BindPhoneResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.BindPhoneResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.BindPhoneResponse} BindPhoneResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            BindPhoneResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a BindPhoneResponse message.
             * @function verify
             * @memberof xunxian.auth.BindPhoneResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            BindPhoneResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    if (!$util.isString(message.token))
                        return "token: string expected";
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    if (!$util.isString(message.refreshToken))
                        return "refreshToken: string expected";
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    if (typeof message.hasCharacter !== "boolean")
                        return "hasCharacter: boolean expected";
                if (message.needConfirm != null && Object.hasOwnProperty.call(message, "needConfirm"))
                    if (typeof message.needConfirm !== "boolean")
                        return "needConfirm: boolean expected";
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo")) {
                    var error = $root.xunxian.auth.PlayerBrief.verify(message.playerInfo, long + 1);
                    if (error)
                        return "playerInfo." + error;
                }
                return null;
            };

            /**
             * Creates a BindPhoneResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.BindPhoneResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.BindPhoneResponse} BindPhoneResponse
             */
            BindPhoneResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.BindPhoneResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.BindPhoneResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.BindPhoneResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.token != null)
                    message.token = String(object.token);
                if (object.refreshToken != null)
                    message.refreshToken = String(object.refreshToken);
                if (object.hasCharacter != null)
                    message.hasCharacter = Boolean(object.hasCharacter);
                if (object.needConfirm != null)
                    message.needConfirm = Boolean(object.needConfirm);
                if (object.playerInfo != null) {
                    if (!$util.isObject(object.playerInfo))
                        throw TypeError(".xunxian.auth.BindPhoneResponse.playerInfo: object expected");
                    message.playerInfo = $root.xunxian.auth.PlayerBrief.fromObject(object.playerInfo, long + 1);
                }
                return message;
            };

            /**
             * Creates a plain object from a BindPhoneResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.BindPhoneResponse
             * @static
             * @param {xunxian.auth.BindPhoneResponse} message BindPhoneResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            BindPhoneResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.token = "";
                    object.refreshToken = "";
                    object.hasCharacter = false;
                    object.needConfirm = false;
                    object.playerInfo = null;
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    object.token = message.token;
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    object.refreshToken = message.refreshToken;
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    object.hasCharacter = message.hasCharacter;
                if (message.needConfirm != null && Object.hasOwnProperty.call(message, "needConfirm"))
                    object.needConfirm = message.needConfirm;
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo"))
                    object.playerInfo = $root.xunxian.auth.PlayerBrief.toObject(message.playerInfo, options, q + 1);
                return object;
            };

            /**
             * Converts this BindPhoneResponse to JSON.
             * @function toJSON
             * @memberof xunxian.auth.BindPhoneResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            BindPhoneResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for BindPhoneResponse
             * @function getTypeUrl
             * @memberof xunxian.auth.BindPhoneResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            BindPhoneResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.BindPhoneResponse";
            };

            return BindPhoneResponse;
        })();

        auth.ConfirmBindRequest = (function() {

            /**
             * Properties of a ConfirmBindRequest.
             * @memberof xunxian.auth
             * @interface IConfirmBindRequest
             * @property {string|null} [openid] ConfirmBindRequest openid
             * @property {string|null} [platform] ConfirmBindRequest platform
             * @property {string|null} [phone] ConfirmBindRequest phone
             */

            /**
             * Constructs a new ConfirmBindRequest.
             * @memberof xunxian.auth
             * @classdesc Represents a ConfirmBindRequest.
             * @implements IConfirmBindRequest
             * @constructor
             * @param {xunxian.auth.IConfirmBindRequest=} [properties] Properties to set
             */
            function ConfirmBindRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ConfirmBindRequest openid.
             * @member {string} openid
             * @memberof xunxian.auth.ConfirmBindRequest
             * @instance
             */
            ConfirmBindRequest.prototype.openid = "";

            /**
             * ConfirmBindRequest platform.
             * @member {string} platform
             * @memberof xunxian.auth.ConfirmBindRequest
             * @instance
             */
            ConfirmBindRequest.prototype.platform = "";

            /**
             * ConfirmBindRequest phone.
             * @member {string} phone
             * @memberof xunxian.auth.ConfirmBindRequest
             * @instance
             */
            ConfirmBindRequest.prototype.phone = "";

            /**
             * Creates a new ConfirmBindRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.ConfirmBindRequest
             * @static
             * @param {xunxian.auth.IConfirmBindRequest=} [properties] Properties to set
             * @returns {xunxian.auth.ConfirmBindRequest} ConfirmBindRequest instance
             */
            ConfirmBindRequest.create = function create(properties) {
                return new ConfirmBindRequest(properties);
            };

            /**
             * Encodes the specified ConfirmBindRequest message. Does not implicitly {@link xunxian.auth.ConfirmBindRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.ConfirmBindRequest
             * @static
             * @param {xunxian.auth.IConfirmBindRequest} message ConfirmBindRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ConfirmBindRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.openid != null && Object.hasOwnProperty.call(message, "openid"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.openid);
                if (message.platform != null && Object.hasOwnProperty.call(message, "platform"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.platform);
                if (message.phone != null && Object.hasOwnProperty.call(message, "phone"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.phone);
                return writer;
            };

            /**
             * Encodes the specified ConfirmBindRequest message, length delimited. Does not implicitly {@link xunxian.auth.ConfirmBindRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.ConfirmBindRequest
             * @static
             * @param {xunxian.auth.IConfirmBindRequest} message ConfirmBindRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ConfirmBindRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a ConfirmBindRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.ConfirmBindRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.ConfirmBindRequest} ConfirmBindRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ConfirmBindRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.ConfirmBindRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.openid = reader.string();
                            break;
                        }
                    case 2: {
                            message.platform = reader.string();
                            break;
                        }
                    case 3: {
                            message.phone = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ConfirmBindRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.ConfirmBindRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.ConfirmBindRequest} ConfirmBindRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ConfirmBindRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ConfirmBindRequest message.
             * @function verify
             * @memberof xunxian.auth.ConfirmBindRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ConfirmBindRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.openid != null && Object.hasOwnProperty.call(message, "openid"))
                    if (!$util.isString(message.openid))
                        return "openid: string expected";
                if (message.platform != null && Object.hasOwnProperty.call(message, "platform"))
                    if (!$util.isString(message.platform))
                        return "platform: string expected";
                if (message.phone != null && Object.hasOwnProperty.call(message, "phone"))
                    if (!$util.isString(message.phone))
                        return "phone: string expected";
                return null;
            };

            /**
             * Creates a ConfirmBindRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.ConfirmBindRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.ConfirmBindRequest} ConfirmBindRequest
             */
            ConfirmBindRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.ConfirmBindRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.ConfirmBindRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.ConfirmBindRequest();
                if (object.openid != null)
                    message.openid = String(object.openid);
                if (object.platform != null)
                    message.platform = String(object.platform);
                if (object.phone != null)
                    message.phone = String(object.phone);
                return message;
            };

            /**
             * Creates a plain object from a ConfirmBindRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.ConfirmBindRequest
             * @static
             * @param {xunxian.auth.ConfirmBindRequest} message ConfirmBindRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ConfirmBindRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.openid = "";
                    object.platform = "";
                    object.phone = "";
                }
                if (message.openid != null && Object.hasOwnProperty.call(message, "openid"))
                    object.openid = message.openid;
                if (message.platform != null && Object.hasOwnProperty.call(message, "platform"))
                    object.platform = message.platform;
                if (message.phone != null && Object.hasOwnProperty.call(message, "phone"))
                    object.phone = message.phone;
                return object;
            };

            /**
             * Converts this ConfirmBindRequest to JSON.
             * @function toJSON
             * @memberof xunxian.auth.ConfirmBindRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ConfirmBindRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ConfirmBindRequest
             * @function getTypeUrl
             * @memberof xunxian.auth.ConfirmBindRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ConfirmBindRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.ConfirmBindRequest";
            };

            return ConfirmBindRequest;
        })();

        auth.ConfirmBindResponse = (function() {

            /**
             * Properties of a ConfirmBindResponse.
             * @memberof xunxian.auth
             * @interface IConfirmBindResponse
             * @property {number|null} [code] ConfirmBindResponse code
             * @property {string|null} [msg] ConfirmBindResponse msg
             * @property {string|null} [token] ConfirmBindResponse token
             * @property {string|null} [refreshToken] ConfirmBindResponse refreshToken
             * @property {boolean|null} [hasCharacter] ConfirmBindResponse hasCharacter
             * @property {xunxian.auth.IPlayerBrief|null} [playerInfo] ConfirmBindResponse playerInfo
             */

            /**
             * Constructs a new ConfirmBindResponse.
             * @memberof xunxian.auth
             * @classdesc Represents a ConfirmBindResponse.
             * @implements IConfirmBindResponse
             * @constructor
             * @param {xunxian.auth.IConfirmBindResponse=} [properties] Properties to set
             */
            function ConfirmBindResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ConfirmBindResponse code.
             * @member {number} code
             * @memberof xunxian.auth.ConfirmBindResponse
             * @instance
             */
            ConfirmBindResponse.prototype.code = 0;

            /**
             * ConfirmBindResponse msg.
             * @member {string} msg
             * @memberof xunxian.auth.ConfirmBindResponse
             * @instance
             */
            ConfirmBindResponse.prototype.msg = "";

            /**
             * ConfirmBindResponse token.
             * @member {string} token
             * @memberof xunxian.auth.ConfirmBindResponse
             * @instance
             */
            ConfirmBindResponse.prototype.token = "";

            /**
             * ConfirmBindResponse refreshToken.
             * @member {string} refreshToken
             * @memberof xunxian.auth.ConfirmBindResponse
             * @instance
             */
            ConfirmBindResponse.prototype.refreshToken = "";

            /**
             * ConfirmBindResponse hasCharacter.
             * @member {boolean} hasCharacter
             * @memberof xunxian.auth.ConfirmBindResponse
             * @instance
             */
            ConfirmBindResponse.prototype.hasCharacter = false;

            /**
             * ConfirmBindResponse playerInfo.
             * @member {xunxian.auth.IPlayerBrief|null|undefined} playerInfo
             * @memberof xunxian.auth.ConfirmBindResponse
             * @instance
             */
            ConfirmBindResponse.prototype.playerInfo = null;

            /**
             * Creates a new ConfirmBindResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.ConfirmBindResponse
             * @static
             * @param {xunxian.auth.IConfirmBindResponse=} [properties] Properties to set
             * @returns {xunxian.auth.ConfirmBindResponse} ConfirmBindResponse instance
             */
            ConfirmBindResponse.create = function create(properties) {
                return new ConfirmBindResponse(properties);
            };

            /**
             * Encodes the specified ConfirmBindResponse message. Does not implicitly {@link xunxian.auth.ConfirmBindResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.ConfirmBindResponse
             * @static
             * @param {xunxian.auth.IConfirmBindResponse} message ConfirmBindResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ConfirmBindResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.token);
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.refreshToken);
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    writer.uint32(/* id 5, wireType 0 =*/40).bool(message.hasCharacter);
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo"))
                    $root.xunxian.auth.PlayerBrief.encode(message.playerInfo, writer.uint32(/* id 6, wireType 2 =*/50).fork(), q + 1).ldelim();
                return writer;
            };

            /**
             * Encodes the specified ConfirmBindResponse message, length delimited. Does not implicitly {@link xunxian.auth.ConfirmBindResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.ConfirmBindResponse
             * @static
             * @param {xunxian.auth.IConfirmBindResponse} message ConfirmBindResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ConfirmBindResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a ConfirmBindResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.ConfirmBindResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.ConfirmBindResponse} ConfirmBindResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ConfirmBindResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.ConfirmBindResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.token = reader.string();
                            break;
                        }
                    case 4: {
                            message.refreshToken = reader.string();
                            break;
                        }
                    case 5: {
                            message.hasCharacter = reader.bool();
                            break;
                        }
                    case 6: {
                            message.playerInfo = $root.xunxian.auth.PlayerBrief.decode(reader, reader.uint32(), undefined, long + 1);
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ConfirmBindResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.ConfirmBindResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.ConfirmBindResponse} ConfirmBindResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ConfirmBindResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ConfirmBindResponse message.
             * @function verify
             * @memberof xunxian.auth.ConfirmBindResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ConfirmBindResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    if (!$util.isString(message.token))
                        return "token: string expected";
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    if (!$util.isString(message.refreshToken))
                        return "refreshToken: string expected";
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    if (typeof message.hasCharacter !== "boolean")
                        return "hasCharacter: boolean expected";
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo")) {
                    var error = $root.xunxian.auth.PlayerBrief.verify(message.playerInfo, long + 1);
                    if (error)
                        return "playerInfo." + error;
                }
                return null;
            };

            /**
             * Creates a ConfirmBindResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.ConfirmBindResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.ConfirmBindResponse} ConfirmBindResponse
             */
            ConfirmBindResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.ConfirmBindResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.ConfirmBindResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.ConfirmBindResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.token != null)
                    message.token = String(object.token);
                if (object.refreshToken != null)
                    message.refreshToken = String(object.refreshToken);
                if (object.hasCharacter != null)
                    message.hasCharacter = Boolean(object.hasCharacter);
                if (object.playerInfo != null) {
                    if (!$util.isObject(object.playerInfo))
                        throw TypeError(".xunxian.auth.ConfirmBindResponse.playerInfo: object expected");
                    message.playerInfo = $root.xunxian.auth.PlayerBrief.fromObject(object.playerInfo, long + 1);
                }
                return message;
            };

            /**
             * Creates a plain object from a ConfirmBindResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.ConfirmBindResponse
             * @static
             * @param {xunxian.auth.ConfirmBindResponse} message ConfirmBindResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ConfirmBindResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.token = "";
                    object.refreshToken = "";
                    object.hasCharacter = false;
                    object.playerInfo = null;
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    object.token = message.token;
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    object.refreshToken = message.refreshToken;
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    object.hasCharacter = message.hasCharacter;
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo"))
                    object.playerInfo = $root.xunxian.auth.PlayerBrief.toObject(message.playerInfo, options, q + 1);
                return object;
            };

            /**
             * Converts this ConfirmBindResponse to JSON.
             * @function toJSON
             * @memberof xunxian.auth.ConfirmBindResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ConfirmBindResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ConfirmBindResponse
             * @function getTypeUrl
             * @memberof xunxian.auth.ConfirmBindResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ConfirmBindResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.ConfirmBindResponse";
            };

            return ConfirmBindResponse;
        })();

        auth.RefreshTokenRequest = (function() {

            /**
             * Properties of a RefreshTokenRequest.
             * @memberof xunxian.auth
             * @interface IRefreshTokenRequest
             * @property {string|null} [refreshToken] RefreshTokenRequest refreshToken
             */

            /**
             * Constructs a new RefreshTokenRequest.
             * @memberof xunxian.auth
             * @classdesc Represents a RefreshTokenRequest.
             * @implements IRefreshTokenRequest
             * @constructor
             * @param {xunxian.auth.IRefreshTokenRequest=} [properties] Properties to set
             */
            function RefreshTokenRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * RefreshTokenRequest refreshToken.
             * @member {string} refreshToken
             * @memberof xunxian.auth.RefreshTokenRequest
             * @instance
             */
            RefreshTokenRequest.prototype.refreshToken = "";

            /**
             * Creates a new RefreshTokenRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.RefreshTokenRequest
             * @static
             * @param {xunxian.auth.IRefreshTokenRequest=} [properties] Properties to set
             * @returns {xunxian.auth.RefreshTokenRequest} RefreshTokenRequest instance
             */
            RefreshTokenRequest.create = function create(properties) {
                return new RefreshTokenRequest(properties);
            };

            /**
             * Encodes the specified RefreshTokenRequest message. Does not implicitly {@link xunxian.auth.RefreshTokenRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.RefreshTokenRequest
             * @static
             * @param {xunxian.auth.IRefreshTokenRequest} message RefreshTokenRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RefreshTokenRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.refreshToken);
                return writer;
            };

            /**
             * Encodes the specified RefreshTokenRequest message, length delimited. Does not implicitly {@link xunxian.auth.RefreshTokenRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.RefreshTokenRequest
             * @static
             * @param {xunxian.auth.IRefreshTokenRequest} message RefreshTokenRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RefreshTokenRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a RefreshTokenRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.RefreshTokenRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.RefreshTokenRequest} RefreshTokenRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RefreshTokenRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.RefreshTokenRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.refreshToken = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a RefreshTokenRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.RefreshTokenRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.RefreshTokenRequest} RefreshTokenRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RefreshTokenRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a RefreshTokenRequest message.
             * @function verify
             * @memberof xunxian.auth.RefreshTokenRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            RefreshTokenRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    if (!$util.isString(message.refreshToken))
                        return "refreshToken: string expected";
                return null;
            };

            /**
             * Creates a RefreshTokenRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.RefreshTokenRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.RefreshTokenRequest} RefreshTokenRequest
             */
            RefreshTokenRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.RefreshTokenRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.RefreshTokenRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.RefreshTokenRequest();
                if (object.refreshToken != null)
                    message.refreshToken = String(object.refreshToken);
                return message;
            };

            /**
             * Creates a plain object from a RefreshTokenRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.RefreshTokenRequest
             * @static
             * @param {xunxian.auth.RefreshTokenRequest} message RefreshTokenRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            RefreshTokenRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults)
                    object.refreshToken = "";
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    object.refreshToken = message.refreshToken;
                return object;
            };

            /**
             * Converts this RefreshTokenRequest to JSON.
             * @function toJSON
             * @memberof xunxian.auth.RefreshTokenRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            RefreshTokenRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for RefreshTokenRequest
             * @function getTypeUrl
             * @memberof xunxian.auth.RefreshTokenRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            RefreshTokenRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.RefreshTokenRequest";
            };

            return RefreshTokenRequest;
        })();

        auth.RefreshTokenResponse = (function() {

            /**
             * Properties of a RefreshTokenResponse.
             * @memberof xunxian.auth
             * @interface IRefreshTokenResponse
             * @property {number|null} [code] RefreshTokenResponse code
             * @property {string|null} [msg] RefreshTokenResponse msg
             * @property {string|null} [token] RefreshTokenResponse token
             * @property {string|null} [refreshToken] RefreshTokenResponse refreshToken
             */

            /**
             * Constructs a new RefreshTokenResponse.
             * @memberof xunxian.auth
             * @classdesc Represents a RefreshTokenResponse.
             * @implements IRefreshTokenResponse
             * @constructor
             * @param {xunxian.auth.IRefreshTokenResponse=} [properties] Properties to set
             */
            function RefreshTokenResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * RefreshTokenResponse code.
             * @member {number} code
             * @memberof xunxian.auth.RefreshTokenResponse
             * @instance
             */
            RefreshTokenResponse.prototype.code = 0;

            /**
             * RefreshTokenResponse msg.
             * @member {string} msg
             * @memberof xunxian.auth.RefreshTokenResponse
             * @instance
             */
            RefreshTokenResponse.prototype.msg = "";

            /**
             * RefreshTokenResponse token.
             * @member {string} token
             * @memberof xunxian.auth.RefreshTokenResponse
             * @instance
             */
            RefreshTokenResponse.prototype.token = "";

            /**
             * RefreshTokenResponse refreshToken.
             * @member {string} refreshToken
             * @memberof xunxian.auth.RefreshTokenResponse
             * @instance
             */
            RefreshTokenResponse.prototype.refreshToken = "";

            /**
             * Creates a new RefreshTokenResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.RefreshTokenResponse
             * @static
             * @param {xunxian.auth.IRefreshTokenResponse=} [properties] Properties to set
             * @returns {xunxian.auth.RefreshTokenResponse} RefreshTokenResponse instance
             */
            RefreshTokenResponse.create = function create(properties) {
                return new RefreshTokenResponse(properties);
            };

            /**
             * Encodes the specified RefreshTokenResponse message. Does not implicitly {@link xunxian.auth.RefreshTokenResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.RefreshTokenResponse
             * @static
             * @param {xunxian.auth.IRefreshTokenResponse} message RefreshTokenResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RefreshTokenResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.token);
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.refreshToken);
                return writer;
            };

            /**
             * Encodes the specified RefreshTokenResponse message, length delimited. Does not implicitly {@link xunxian.auth.RefreshTokenResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.RefreshTokenResponse
             * @static
             * @param {xunxian.auth.IRefreshTokenResponse} message RefreshTokenResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RefreshTokenResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a RefreshTokenResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.RefreshTokenResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.RefreshTokenResponse} RefreshTokenResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RefreshTokenResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.RefreshTokenResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.token = reader.string();
                            break;
                        }
                    case 4: {
                            message.refreshToken = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a RefreshTokenResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.RefreshTokenResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.RefreshTokenResponse} RefreshTokenResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RefreshTokenResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a RefreshTokenResponse message.
             * @function verify
             * @memberof xunxian.auth.RefreshTokenResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            RefreshTokenResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    if (!$util.isString(message.token))
                        return "token: string expected";
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    if (!$util.isString(message.refreshToken))
                        return "refreshToken: string expected";
                return null;
            };

            /**
             * Creates a RefreshTokenResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.RefreshTokenResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.RefreshTokenResponse} RefreshTokenResponse
             */
            RefreshTokenResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.RefreshTokenResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.RefreshTokenResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.RefreshTokenResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.token != null)
                    message.token = String(object.token);
                if (object.refreshToken != null)
                    message.refreshToken = String(object.refreshToken);
                return message;
            };

            /**
             * Creates a plain object from a RefreshTokenResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.RefreshTokenResponse
             * @static
             * @param {xunxian.auth.RefreshTokenResponse} message RefreshTokenResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            RefreshTokenResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.token = "";
                    object.refreshToken = "";
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    object.token = message.token;
                if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                    object.refreshToken = message.refreshToken;
                return object;
            };

            /**
             * Converts this RefreshTokenResponse to JSON.
             * @function toJSON
             * @memberof xunxian.auth.RefreshTokenResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            RefreshTokenResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for RefreshTokenResponse
             * @function getTypeUrl
             * @memberof xunxian.auth.RefreshTokenResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            RefreshTokenResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.RefreshTokenResponse";
            };

            return RefreshTokenResponse;
        })();

        auth.CheckTokenRequest = (function() {

            /**
             * Properties of a CheckTokenRequest.
             * @memberof xunxian.auth
             * @interface ICheckTokenRequest
             * @property {string|null} [token] CheckTokenRequest token
             */

            /**
             * Constructs a new CheckTokenRequest.
             * @memberof xunxian.auth
             * @classdesc Represents a CheckTokenRequest.
             * @implements ICheckTokenRequest
             * @constructor
             * @param {xunxian.auth.ICheckTokenRequest=} [properties] Properties to set
             */
            function CheckTokenRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * CheckTokenRequest token.
             * @member {string} token
             * @memberof xunxian.auth.CheckTokenRequest
             * @instance
             */
            CheckTokenRequest.prototype.token = "";

            /**
             * Creates a new CheckTokenRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.CheckTokenRequest
             * @static
             * @param {xunxian.auth.ICheckTokenRequest=} [properties] Properties to set
             * @returns {xunxian.auth.CheckTokenRequest} CheckTokenRequest instance
             */
            CheckTokenRequest.create = function create(properties) {
                return new CheckTokenRequest(properties);
            };

            /**
             * Encodes the specified CheckTokenRequest message. Does not implicitly {@link xunxian.auth.CheckTokenRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.CheckTokenRequest
             * @static
             * @param {xunxian.auth.ICheckTokenRequest} message CheckTokenRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            CheckTokenRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.token);
                return writer;
            };

            /**
             * Encodes the specified CheckTokenRequest message, length delimited. Does not implicitly {@link xunxian.auth.CheckTokenRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.CheckTokenRequest
             * @static
             * @param {xunxian.auth.ICheckTokenRequest} message CheckTokenRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            CheckTokenRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a CheckTokenRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.CheckTokenRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.CheckTokenRequest} CheckTokenRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            CheckTokenRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.CheckTokenRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.token = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a CheckTokenRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.CheckTokenRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.CheckTokenRequest} CheckTokenRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            CheckTokenRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a CheckTokenRequest message.
             * @function verify
             * @memberof xunxian.auth.CheckTokenRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            CheckTokenRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    if (!$util.isString(message.token))
                        return "token: string expected";
                return null;
            };

            /**
             * Creates a CheckTokenRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.CheckTokenRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.CheckTokenRequest} CheckTokenRequest
             */
            CheckTokenRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.CheckTokenRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.CheckTokenRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.CheckTokenRequest();
                if (object.token != null)
                    message.token = String(object.token);
                return message;
            };

            /**
             * Creates a plain object from a CheckTokenRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.CheckTokenRequest
             * @static
             * @param {xunxian.auth.CheckTokenRequest} message CheckTokenRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            CheckTokenRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults)
                    object.token = "";
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    object.token = message.token;
                return object;
            };

            /**
             * Converts this CheckTokenRequest to JSON.
             * @function toJSON
             * @memberof xunxian.auth.CheckTokenRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            CheckTokenRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for CheckTokenRequest
             * @function getTypeUrl
             * @memberof xunxian.auth.CheckTokenRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            CheckTokenRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.CheckTokenRequest";
            };

            return CheckTokenRequest;
        })();

        auth.CheckTokenResponse = (function() {

            /**
             * Properties of a CheckTokenResponse.
             * @memberof xunxian.auth
             * @interface ICheckTokenResponse
             * @property {number|null} [code] CheckTokenResponse code
             * @property {string|null} [msg] CheckTokenResponse msg
             * @property {number|Long|null} [accountId] CheckTokenResponse accountId
             * @property {boolean|null} [hasCharacter] CheckTokenResponse hasCharacter
             * @property {xunxian.auth.IPlayerBrief|null} [playerInfo] CheckTokenResponse playerInfo
             */

            /**
             * Constructs a new CheckTokenResponse.
             * @memberof xunxian.auth
             * @classdesc Represents a CheckTokenResponse.
             * @implements ICheckTokenResponse
             * @constructor
             * @param {xunxian.auth.ICheckTokenResponse=} [properties] Properties to set
             */
            function CheckTokenResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * CheckTokenResponse code.
             * @member {number} code
             * @memberof xunxian.auth.CheckTokenResponse
             * @instance
             */
            CheckTokenResponse.prototype.code = 0;

            /**
             * CheckTokenResponse msg.
             * @member {string} msg
             * @memberof xunxian.auth.CheckTokenResponse
             * @instance
             */
            CheckTokenResponse.prototype.msg = "";

            /**
             * CheckTokenResponse accountId.
             * @member {number|Long} accountId
             * @memberof xunxian.auth.CheckTokenResponse
             * @instance
             */
            CheckTokenResponse.prototype.accountId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * CheckTokenResponse hasCharacter.
             * @member {boolean} hasCharacter
             * @memberof xunxian.auth.CheckTokenResponse
             * @instance
             */
            CheckTokenResponse.prototype.hasCharacter = false;

            /**
             * CheckTokenResponse playerInfo.
             * @member {xunxian.auth.IPlayerBrief|null|undefined} playerInfo
             * @memberof xunxian.auth.CheckTokenResponse
             * @instance
             */
            CheckTokenResponse.prototype.playerInfo = null;

            /**
             * Creates a new CheckTokenResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.CheckTokenResponse
             * @static
             * @param {xunxian.auth.ICheckTokenResponse=} [properties] Properties to set
             * @returns {xunxian.auth.CheckTokenResponse} CheckTokenResponse instance
             */
            CheckTokenResponse.create = function create(properties) {
                return new CheckTokenResponse(properties);
            };

            /**
             * Encodes the specified CheckTokenResponse message. Does not implicitly {@link xunxian.auth.CheckTokenResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.CheckTokenResponse
             * @static
             * @param {xunxian.auth.ICheckTokenResponse} message CheckTokenResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            CheckTokenResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.accountId != null && Object.hasOwnProperty.call(message, "accountId"))
                    writer.uint32(/* id 3, wireType 0 =*/24).int64(message.accountId);
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    writer.uint32(/* id 4, wireType 0 =*/32).bool(message.hasCharacter);
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo"))
                    $root.xunxian.auth.PlayerBrief.encode(message.playerInfo, writer.uint32(/* id 5, wireType 2 =*/42).fork(), q + 1).ldelim();
                return writer;
            };

            /**
             * Encodes the specified CheckTokenResponse message, length delimited. Does not implicitly {@link xunxian.auth.CheckTokenResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.CheckTokenResponse
             * @static
             * @param {xunxian.auth.ICheckTokenResponse} message CheckTokenResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            CheckTokenResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a CheckTokenResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.CheckTokenResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.CheckTokenResponse} CheckTokenResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            CheckTokenResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.CheckTokenResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.accountId = reader.int64();
                            break;
                        }
                    case 4: {
                            message.hasCharacter = reader.bool();
                            break;
                        }
                    case 5: {
                            message.playerInfo = $root.xunxian.auth.PlayerBrief.decode(reader, reader.uint32(), undefined, long + 1);
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a CheckTokenResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.CheckTokenResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.CheckTokenResponse} CheckTokenResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            CheckTokenResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a CheckTokenResponse message.
             * @function verify
             * @memberof xunxian.auth.CheckTokenResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            CheckTokenResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.accountId != null && Object.hasOwnProperty.call(message, "accountId"))
                    if (!$util.isInteger(message.accountId) && !(message.accountId && $util.isInteger(message.accountId.low) && $util.isInteger(message.accountId.high)))
                        return "accountId: integer|Long expected";
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    if (typeof message.hasCharacter !== "boolean")
                        return "hasCharacter: boolean expected";
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo")) {
                    var error = $root.xunxian.auth.PlayerBrief.verify(message.playerInfo, long + 1);
                    if (error)
                        return "playerInfo." + error;
                }
                return null;
            };

            /**
             * Creates a CheckTokenResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.CheckTokenResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.CheckTokenResponse} CheckTokenResponse
             */
            CheckTokenResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.CheckTokenResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.CheckTokenResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.CheckTokenResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.accountId != null)
                    if ($util.Long)
                        message.accountId = $util.Long.fromValue(object.accountId, false);
                    else if (typeof object.accountId === "string")
                        message.accountId = parseInt(object.accountId, 10);
                    else if (typeof object.accountId === "number")
                        message.accountId = object.accountId;
                    else if (typeof object.accountId === "object")
                        message.accountId = new $util.LongBits(object.accountId.low >>> 0, object.accountId.high >>> 0).toNumber();
                if (object.hasCharacter != null)
                    message.hasCharacter = Boolean(object.hasCharacter);
                if (object.playerInfo != null) {
                    if (!$util.isObject(object.playerInfo))
                        throw TypeError(".xunxian.auth.CheckTokenResponse.playerInfo: object expected");
                    message.playerInfo = $root.xunxian.auth.PlayerBrief.fromObject(object.playerInfo, long + 1);
                }
                return message;
            };

            /**
             * Creates a plain object from a CheckTokenResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.CheckTokenResponse
             * @static
             * @param {xunxian.auth.CheckTokenResponse} message CheckTokenResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            CheckTokenResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.accountId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.accountId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                    object.hasCharacter = false;
                    object.playerInfo = null;
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.accountId != null && Object.hasOwnProperty.call(message, "accountId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.accountId = typeof message.accountId === "number" ? BigInt(message.accountId) : $util.Long.fromBits(message.accountId.low >>> 0, message.accountId.high >>> 0, false).toBigInt();
                    else if (typeof message.accountId === "number")
                        object.accountId = options.longs === String ? String(message.accountId) : message.accountId;
                    else
                        object.accountId = options.longs === String ? $util.Long.prototype.toString.call(message.accountId) : options.longs === Number ? new $util.LongBits(message.accountId.low >>> 0, message.accountId.high >>> 0).toNumber() : message.accountId;
                if (message.hasCharacter != null && Object.hasOwnProperty.call(message, "hasCharacter"))
                    object.hasCharacter = message.hasCharacter;
                if (message.playerInfo != null && Object.hasOwnProperty.call(message, "playerInfo"))
                    object.playerInfo = $root.xunxian.auth.PlayerBrief.toObject(message.playerInfo, options, q + 1);
                return object;
            };

            /**
             * Converts this CheckTokenResponse to JSON.
             * @function toJSON
             * @memberof xunxian.auth.CheckTokenResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            CheckTokenResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for CheckTokenResponse
             * @function getTypeUrl
             * @memberof xunxian.auth.CheckTokenResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            CheckTokenResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.CheckTokenResponse";
            };

            return CheckTokenResponse;
        })();

        auth.PlayerBrief = (function() {

            /**
             * Properties of a PlayerBrief.
             * @memberof xunxian.auth
             * @interface IPlayerBrief
             * @property {number|Long|null} [playerId] PlayerBrief playerId
             * @property {string|null} [name] PlayerBrief name
             * @property {number|null} [gender] PlayerBrief gender
             * @property {number|null} [levelStage] PlayerBrief levelStage
             * @property {number|null} [levelTier] PlayerBrief levelTier
             * @property {number|null} [levelStep] PlayerBrief levelStep
             * @property {number|null} [sceneId] PlayerBrief sceneId
             * @property {number|null} [posX] PlayerBrief posX
             * @property {number|null} [posY] PlayerBrief posY
             */

            /**
             * Constructs a new PlayerBrief.
             * @memberof xunxian.auth
             * @classdesc Represents a PlayerBrief.
             * @implements IPlayerBrief
             * @constructor
             * @param {xunxian.auth.IPlayerBrief=} [properties] Properties to set
             */
            function PlayerBrief(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * PlayerBrief playerId.
             * @member {number|Long} playerId
             * @memberof xunxian.auth.PlayerBrief
             * @instance
             */
            PlayerBrief.prototype.playerId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * PlayerBrief name.
             * @member {string} name
             * @memberof xunxian.auth.PlayerBrief
             * @instance
             */
            PlayerBrief.prototype.name = "";

            /**
             * PlayerBrief gender.
             * @member {number} gender
             * @memberof xunxian.auth.PlayerBrief
             * @instance
             */
            PlayerBrief.prototype.gender = 0;

            /**
             * PlayerBrief levelStage.
             * @member {number} levelStage
             * @memberof xunxian.auth.PlayerBrief
             * @instance
             */
            PlayerBrief.prototype.levelStage = 0;

            /**
             * PlayerBrief levelTier.
             * @member {number} levelTier
             * @memberof xunxian.auth.PlayerBrief
             * @instance
             */
            PlayerBrief.prototype.levelTier = 0;

            /**
             * PlayerBrief levelStep.
             * @member {number} levelStep
             * @memberof xunxian.auth.PlayerBrief
             * @instance
             */
            PlayerBrief.prototype.levelStep = 0;

            /**
             * PlayerBrief sceneId.
             * @member {number} sceneId
             * @memberof xunxian.auth.PlayerBrief
             * @instance
             */
            PlayerBrief.prototype.sceneId = 0;

            /**
             * PlayerBrief posX.
             * @member {number} posX
             * @memberof xunxian.auth.PlayerBrief
             * @instance
             */
            PlayerBrief.prototype.posX = 0;

            /**
             * PlayerBrief posY.
             * @member {number} posY
             * @memberof xunxian.auth.PlayerBrief
             * @instance
             */
            PlayerBrief.prototype.posY = 0;

            /**
             * Creates a new PlayerBrief instance using the specified properties.
             * @function create
             * @memberof xunxian.auth.PlayerBrief
             * @static
             * @param {xunxian.auth.IPlayerBrief=} [properties] Properties to set
             * @returns {xunxian.auth.PlayerBrief} PlayerBrief instance
             */
            PlayerBrief.create = function create(properties) {
                return new PlayerBrief(properties);
            };

            /**
             * Encodes the specified PlayerBrief message. Does not implicitly {@link xunxian.auth.PlayerBrief.verify|verify} messages.
             * @function encode
             * @memberof xunxian.auth.PlayerBrief
             * @static
             * @param {xunxian.auth.IPlayerBrief} message PlayerBrief message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PlayerBrief.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.playerId);
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.name);
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    writer.uint32(/* id 3, wireType 0 =*/24).int32(message.gender);
                if (message.levelStage != null && Object.hasOwnProperty.call(message, "levelStage"))
                    writer.uint32(/* id 4, wireType 0 =*/32).int32(message.levelStage);
                if (message.levelTier != null && Object.hasOwnProperty.call(message, "levelTier"))
                    writer.uint32(/* id 5, wireType 0 =*/40).int32(message.levelTier);
                if (message.levelStep != null && Object.hasOwnProperty.call(message, "levelStep"))
                    writer.uint32(/* id 6, wireType 0 =*/48).int32(message.levelStep);
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    writer.uint32(/* id 7, wireType 0 =*/56).int32(message.sceneId);
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    writer.uint32(/* id 8, wireType 5 =*/69).float(message.posX);
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    writer.uint32(/* id 9, wireType 5 =*/77).float(message.posY);
                return writer;
            };

            /**
             * Encodes the specified PlayerBrief message, length delimited. Does not implicitly {@link xunxian.auth.PlayerBrief.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.auth.PlayerBrief
             * @static
             * @param {xunxian.auth.IPlayerBrief} message PlayerBrief message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PlayerBrief.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a PlayerBrief message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.auth.PlayerBrief
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.auth.PlayerBrief} PlayerBrief
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PlayerBrief.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.auth.PlayerBrief();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.playerId = reader.int64();
                            break;
                        }
                    case 2: {
                            message.name = reader.string();
                            break;
                        }
                    case 3: {
                            message.gender = reader.int32();
                            break;
                        }
                    case 4: {
                            message.levelStage = reader.int32();
                            break;
                        }
                    case 5: {
                            message.levelTier = reader.int32();
                            break;
                        }
                    case 6: {
                            message.levelStep = reader.int32();
                            break;
                        }
                    case 7: {
                            message.sceneId = reader.int32();
                            break;
                        }
                    case 8: {
                            message.posX = reader.float();
                            break;
                        }
                    case 9: {
                            message.posY = reader.float();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a PlayerBrief message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.auth.PlayerBrief
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.auth.PlayerBrief} PlayerBrief
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PlayerBrief.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a PlayerBrief message.
             * @function verify
             * @memberof xunxian.auth.PlayerBrief
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            PlayerBrief.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (!$util.isInteger(message.playerId) && !(message.playerId && $util.isInteger(message.playerId.low) && $util.isInteger(message.playerId.high)))
                        return "playerId: integer|Long expected";
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    if (!$util.isString(message.name))
                        return "name: string expected";
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    if (!$util.isInteger(message.gender))
                        return "gender: integer expected";
                if (message.levelStage != null && Object.hasOwnProperty.call(message, "levelStage"))
                    if (!$util.isInteger(message.levelStage))
                        return "levelStage: integer expected";
                if (message.levelTier != null && Object.hasOwnProperty.call(message, "levelTier"))
                    if (!$util.isInteger(message.levelTier))
                        return "levelTier: integer expected";
                if (message.levelStep != null && Object.hasOwnProperty.call(message, "levelStep"))
                    if (!$util.isInteger(message.levelStep))
                        return "levelStep: integer expected";
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    if (!$util.isInteger(message.sceneId))
                        return "sceneId: integer expected";
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    if (typeof message.posX !== "number")
                        return "posX: number expected";
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    if (typeof message.posY !== "number")
                        return "posY: number expected";
                return null;
            };

            /**
             * Creates a PlayerBrief message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.auth.PlayerBrief
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.auth.PlayerBrief} PlayerBrief
             */
            PlayerBrief.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.auth.PlayerBrief)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.auth.PlayerBrief: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.auth.PlayerBrief();
                if (object.playerId != null)
                    if ($util.Long)
                        message.playerId = $util.Long.fromValue(object.playerId, false);
                    else if (typeof object.playerId === "string")
                        message.playerId = parseInt(object.playerId, 10);
                    else if (typeof object.playerId === "number")
                        message.playerId = object.playerId;
                    else if (typeof object.playerId === "object")
                        message.playerId = new $util.LongBits(object.playerId.low >>> 0, object.playerId.high >>> 0).toNumber();
                if (object.name != null)
                    message.name = String(object.name);
                if (object.gender != null)
                    message.gender = object.gender | 0;
                if (object.levelStage != null)
                    message.levelStage = object.levelStage | 0;
                if (object.levelTier != null)
                    message.levelTier = object.levelTier | 0;
                if (object.levelStep != null)
                    message.levelStep = object.levelStep | 0;
                if (object.sceneId != null)
                    message.sceneId = object.sceneId | 0;
                if (object.posX != null)
                    message.posX = Number(object.posX);
                if (object.posY != null)
                    message.posY = Number(object.posY);
                return message;
            };

            /**
             * Creates a plain object from a PlayerBrief message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.auth.PlayerBrief
             * @static
             * @param {xunxian.auth.PlayerBrief} message PlayerBrief
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            PlayerBrief.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.playerId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.playerId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                    object.name = "";
                    object.gender = 0;
                    object.levelStage = 0;
                    object.levelTier = 0;
                    object.levelStep = 0;
                    object.sceneId = 0;
                    object.posX = 0;
                    object.posY = 0;
                }
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.playerId = typeof message.playerId === "number" ? BigInt(message.playerId) : $util.Long.fromBits(message.playerId.low >>> 0, message.playerId.high >>> 0, false).toBigInt();
                    else if (typeof message.playerId === "number")
                        object.playerId = options.longs === String ? String(message.playerId) : message.playerId;
                    else
                        object.playerId = options.longs === String ? $util.Long.prototype.toString.call(message.playerId) : options.longs === Number ? new $util.LongBits(message.playerId.low >>> 0, message.playerId.high >>> 0).toNumber() : message.playerId;
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    object.name = message.name;
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    object.gender = message.gender;
                if (message.levelStage != null && Object.hasOwnProperty.call(message, "levelStage"))
                    object.levelStage = message.levelStage;
                if (message.levelTier != null && Object.hasOwnProperty.call(message, "levelTier"))
                    object.levelTier = message.levelTier;
                if (message.levelStep != null && Object.hasOwnProperty.call(message, "levelStep"))
                    object.levelStep = message.levelStep;
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    object.sceneId = message.sceneId;
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    object.posX = options.json && !isFinite(message.posX) ? String(message.posX) : message.posX;
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    object.posY = options.json && !isFinite(message.posY) ? String(message.posY) : message.posY;
                return object;
            };

            /**
             * Converts this PlayerBrief to JSON.
             * @function toJSON
             * @memberof xunxian.auth.PlayerBrief
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            PlayerBrief.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for PlayerBrief
             * @function getTypeUrl
             * @memberof xunxian.auth.PlayerBrief
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            PlayerBrief.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.auth.PlayerBrief";
            };

            return PlayerBrief;
        })();

        return auth;
    })();

    xunxian.player = (function() {

        /**
         * Namespace player.
         * @memberof xunxian
         * @namespace
         */
        var player = {};

        player.CreateCharacterRequest = (function() {

            /**
             * Properties of a CreateCharacterRequest.
             * @memberof xunxian.player
             * @interface ICreateCharacterRequest
             * @property {string|null} [name] CreateCharacterRequest name
             * @property {number|null} [gender] CreateCharacterRequest gender
             */

            /**
             * Constructs a new CreateCharacterRequest.
             * @memberof xunxian.player
             * @classdesc Represents a CreateCharacterRequest.
             * @implements ICreateCharacterRequest
             * @constructor
             * @param {xunxian.player.ICreateCharacterRequest=} [properties] Properties to set
             */
            function CreateCharacterRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * CreateCharacterRequest name.
             * @member {string} name
             * @memberof xunxian.player.CreateCharacterRequest
             * @instance
             */
            CreateCharacterRequest.prototype.name = "";

            /**
             * CreateCharacterRequest gender.
             * @member {number} gender
             * @memberof xunxian.player.CreateCharacterRequest
             * @instance
             */
            CreateCharacterRequest.prototype.gender = 0;

            /**
             * Creates a new CreateCharacterRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.player.CreateCharacterRequest
             * @static
             * @param {xunxian.player.ICreateCharacterRequest=} [properties] Properties to set
             * @returns {xunxian.player.CreateCharacterRequest} CreateCharacterRequest instance
             */
            CreateCharacterRequest.create = function create(properties) {
                return new CreateCharacterRequest(properties);
            };

            /**
             * Encodes the specified CreateCharacterRequest message. Does not implicitly {@link xunxian.player.CreateCharacterRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.player.CreateCharacterRequest
             * @static
             * @param {xunxian.player.ICreateCharacterRequest} message CreateCharacterRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            CreateCharacterRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.gender);
                return writer;
            };

            /**
             * Encodes the specified CreateCharacterRequest message, length delimited. Does not implicitly {@link xunxian.player.CreateCharacterRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.player.CreateCharacterRequest
             * @static
             * @param {xunxian.player.ICreateCharacterRequest} message CreateCharacterRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            CreateCharacterRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a CreateCharacterRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.player.CreateCharacterRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.player.CreateCharacterRequest} CreateCharacterRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            CreateCharacterRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.player.CreateCharacterRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.name = reader.string();
                            break;
                        }
                    case 2: {
                            message.gender = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a CreateCharacterRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.player.CreateCharacterRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.player.CreateCharacterRequest} CreateCharacterRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            CreateCharacterRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a CreateCharacterRequest message.
             * @function verify
             * @memberof xunxian.player.CreateCharacterRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            CreateCharacterRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    if (!$util.isString(message.name))
                        return "name: string expected";
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    if (!$util.isInteger(message.gender))
                        return "gender: integer expected";
                return null;
            };

            /**
             * Creates a CreateCharacterRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.player.CreateCharacterRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.player.CreateCharacterRequest} CreateCharacterRequest
             */
            CreateCharacterRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.player.CreateCharacterRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.player.CreateCharacterRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.player.CreateCharacterRequest();
                if (object.name != null)
                    message.name = String(object.name);
                if (object.gender != null)
                    message.gender = object.gender | 0;
                return message;
            };

            /**
             * Creates a plain object from a CreateCharacterRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.player.CreateCharacterRequest
             * @static
             * @param {xunxian.player.CreateCharacterRequest} message CreateCharacterRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            CreateCharacterRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.name = "";
                    object.gender = 0;
                }
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    object.name = message.name;
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    object.gender = message.gender;
                return object;
            };

            /**
             * Converts this CreateCharacterRequest to JSON.
             * @function toJSON
             * @memberof xunxian.player.CreateCharacterRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            CreateCharacterRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for CreateCharacterRequest
             * @function getTypeUrl
             * @memberof xunxian.player.CreateCharacterRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            CreateCharacterRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.player.CreateCharacterRequest";
            };

            return CreateCharacterRequest;
        })();

        player.CreateCharacterResponse = (function() {

            /**
             * Properties of a CreateCharacterResponse.
             * @memberof xunxian.player
             * @interface ICreateCharacterResponse
             * @property {number|null} [code] CreateCharacterResponse code
             * @property {string|null} [msg] CreateCharacterResponse msg
             * @property {number|Long|null} [playerId] CreateCharacterResponse playerId
             * @property {string|null} [name] CreateCharacterResponse name
             * @property {number|null} [gender] CreateCharacterResponse gender
             * @property {xunxian.player.IPlayerAttrs|null} [attrs] CreateCharacterResponse attrs
             * @property {number|null} [sceneId] CreateCharacterResponse sceneId
             * @property {number|null} [posX] CreateCharacterResponse posX
             * @property {number|null} [posY] CreateCharacterResponse posY
             */

            /**
             * Constructs a new CreateCharacterResponse.
             * @memberof xunxian.player
             * @classdesc Represents a CreateCharacterResponse.
             * @implements ICreateCharacterResponse
             * @constructor
             * @param {xunxian.player.ICreateCharacterResponse=} [properties] Properties to set
             */
            function CreateCharacterResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * CreateCharacterResponse code.
             * @member {number} code
             * @memberof xunxian.player.CreateCharacterResponse
             * @instance
             */
            CreateCharacterResponse.prototype.code = 0;

            /**
             * CreateCharacterResponse msg.
             * @member {string} msg
             * @memberof xunxian.player.CreateCharacterResponse
             * @instance
             */
            CreateCharacterResponse.prototype.msg = "";

            /**
             * CreateCharacterResponse playerId.
             * @member {number|Long} playerId
             * @memberof xunxian.player.CreateCharacterResponse
             * @instance
             */
            CreateCharacterResponse.prototype.playerId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * CreateCharacterResponse name.
             * @member {string} name
             * @memberof xunxian.player.CreateCharacterResponse
             * @instance
             */
            CreateCharacterResponse.prototype.name = "";

            /**
             * CreateCharacterResponse gender.
             * @member {number} gender
             * @memberof xunxian.player.CreateCharacterResponse
             * @instance
             */
            CreateCharacterResponse.prototype.gender = 0;

            /**
             * CreateCharacterResponse attrs.
             * @member {xunxian.player.IPlayerAttrs|null|undefined} attrs
             * @memberof xunxian.player.CreateCharacterResponse
             * @instance
             */
            CreateCharacterResponse.prototype.attrs = null;

            /**
             * CreateCharacterResponse sceneId.
             * @member {number} sceneId
             * @memberof xunxian.player.CreateCharacterResponse
             * @instance
             */
            CreateCharacterResponse.prototype.sceneId = 0;

            /**
             * CreateCharacterResponse posX.
             * @member {number} posX
             * @memberof xunxian.player.CreateCharacterResponse
             * @instance
             */
            CreateCharacterResponse.prototype.posX = 0;

            /**
             * CreateCharacterResponse posY.
             * @member {number} posY
             * @memberof xunxian.player.CreateCharacterResponse
             * @instance
             */
            CreateCharacterResponse.prototype.posY = 0;

            /**
             * Creates a new CreateCharacterResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.player.CreateCharacterResponse
             * @static
             * @param {xunxian.player.ICreateCharacterResponse=} [properties] Properties to set
             * @returns {xunxian.player.CreateCharacterResponse} CreateCharacterResponse instance
             */
            CreateCharacterResponse.create = function create(properties) {
                return new CreateCharacterResponse(properties);
            };

            /**
             * Encodes the specified CreateCharacterResponse message. Does not implicitly {@link xunxian.player.CreateCharacterResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.player.CreateCharacterResponse
             * @static
             * @param {xunxian.player.ICreateCharacterResponse} message CreateCharacterResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            CreateCharacterResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    writer.uint32(/* id 3, wireType 0 =*/24).int64(message.playerId);
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.name);
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    writer.uint32(/* id 5, wireType 0 =*/40).int32(message.gender);
                if (message.attrs != null && Object.hasOwnProperty.call(message, "attrs"))
                    $root.xunxian.player.PlayerAttrs.encode(message.attrs, writer.uint32(/* id 6, wireType 2 =*/50).fork(), q + 1).ldelim();
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    writer.uint32(/* id 7, wireType 0 =*/56).int32(message.sceneId);
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    writer.uint32(/* id 8, wireType 5 =*/69).float(message.posX);
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    writer.uint32(/* id 9, wireType 5 =*/77).float(message.posY);
                return writer;
            };

            /**
             * Encodes the specified CreateCharacterResponse message, length delimited. Does not implicitly {@link xunxian.player.CreateCharacterResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.player.CreateCharacterResponse
             * @static
             * @param {xunxian.player.ICreateCharacterResponse} message CreateCharacterResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            CreateCharacterResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a CreateCharacterResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.player.CreateCharacterResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.player.CreateCharacterResponse} CreateCharacterResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            CreateCharacterResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.player.CreateCharacterResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.playerId = reader.int64();
                            break;
                        }
                    case 4: {
                            message.name = reader.string();
                            break;
                        }
                    case 5: {
                            message.gender = reader.int32();
                            break;
                        }
                    case 6: {
                            message.attrs = $root.xunxian.player.PlayerAttrs.decode(reader, reader.uint32(), undefined, long + 1);
                            break;
                        }
                    case 7: {
                            message.sceneId = reader.int32();
                            break;
                        }
                    case 8: {
                            message.posX = reader.float();
                            break;
                        }
                    case 9: {
                            message.posY = reader.float();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a CreateCharacterResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.player.CreateCharacterResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.player.CreateCharacterResponse} CreateCharacterResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            CreateCharacterResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a CreateCharacterResponse message.
             * @function verify
             * @memberof xunxian.player.CreateCharacterResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            CreateCharacterResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (!$util.isInteger(message.playerId) && !(message.playerId && $util.isInteger(message.playerId.low) && $util.isInteger(message.playerId.high)))
                        return "playerId: integer|Long expected";
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    if (!$util.isString(message.name))
                        return "name: string expected";
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    if (!$util.isInteger(message.gender))
                        return "gender: integer expected";
                if (message.attrs != null && Object.hasOwnProperty.call(message, "attrs")) {
                    var error = $root.xunxian.player.PlayerAttrs.verify(message.attrs, long + 1);
                    if (error)
                        return "attrs." + error;
                }
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    if (!$util.isInteger(message.sceneId))
                        return "sceneId: integer expected";
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    if (typeof message.posX !== "number")
                        return "posX: number expected";
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    if (typeof message.posY !== "number")
                        return "posY: number expected";
                return null;
            };

            /**
             * Creates a CreateCharacterResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.player.CreateCharacterResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.player.CreateCharacterResponse} CreateCharacterResponse
             */
            CreateCharacterResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.player.CreateCharacterResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.player.CreateCharacterResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.player.CreateCharacterResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.playerId != null)
                    if ($util.Long)
                        message.playerId = $util.Long.fromValue(object.playerId, false);
                    else if (typeof object.playerId === "string")
                        message.playerId = parseInt(object.playerId, 10);
                    else if (typeof object.playerId === "number")
                        message.playerId = object.playerId;
                    else if (typeof object.playerId === "object")
                        message.playerId = new $util.LongBits(object.playerId.low >>> 0, object.playerId.high >>> 0).toNumber();
                if (object.name != null)
                    message.name = String(object.name);
                if (object.gender != null)
                    message.gender = object.gender | 0;
                if (object.attrs != null) {
                    if (!$util.isObject(object.attrs))
                        throw TypeError(".xunxian.player.CreateCharacterResponse.attrs: object expected");
                    message.attrs = $root.xunxian.player.PlayerAttrs.fromObject(object.attrs, long + 1);
                }
                if (object.sceneId != null)
                    message.sceneId = object.sceneId | 0;
                if (object.posX != null)
                    message.posX = Number(object.posX);
                if (object.posY != null)
                    message.posY = Number(object.posY);
                return message;
            };

            /**
             * Creates a plain object from a CreateCharacterResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.player.CreateCharacterResponse
             * @static
             * @param {xunxian.player.CreateCharacterResponse} message CreateCharacterResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            CreateCharacterResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.playerId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.playerId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                    object.name = "";
                    object.gender = 0;
                    object.attrs = null;
                    object.sceneId = 0;
                    object.posX = 0;
                    object.posY = 0;
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.playerId = typeof message.playerId === "number" ? BigInt(message.playerId) : $util.Long.fromBits(message.playerId.low >>> 0, message.playerId.high >>> 0, false).toBigInt();
                    else if (typeof message.playerId === "number")
                        object.playerId = options.longs === String ? String(message.playerId) : message.playerId;
                    else
                        object.playerId = options.longs === String ? $util.Long.prototype.toString.call(message.playerId) : options.longs === Number ? new $util.LongBits(message.playerId.low >>> 0, message.playerId.high >>> 0).toNumber() : message.playerId;
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    object.name = message.name;
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    object.gender = message.gender;
                if (message.attrs != null && Object.hasOwnProperty.call(message, "attrs"))
                    object.attrs = $root.xunxian.player.PlayerAttrs.toObject(message.attrs, options, q + 1);
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    object.sceneId = message.sceneId;
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    object.posX = options.json && !isFinite(message.posX) ? String(message.posX) : message.posX;
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    object.posY = options.json && !isFinite(message.posY) ? String(message.posY) : message.posY;
                return object;
            };

            /**
             * Converts this CreateCharacterResponse to JSON.
             * @function toJSON
             * @memberof xunxian.player.CreateCharacterResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            CreateCharacterResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for CreateCharacterResponse
             * @function getTypeUrl
             * @memberof xunxian.player.CreateCharacterResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            CreateCharacterResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.player.CreateCharacterResponse";
            };

            return CreateCharacterResponse;
        })();

        player.GetPlayerRequest = (function() {

            /**
             * Properties of a GetPlayerRequest.
             * @memberof xunxian.player
             * @interface IGetPlayerRequest
             * @property {number|Long|null} [playerId] GetPlayerRequest playerId
             */

            /**
             * Constructs a new GetPlayerRequest.
             * @memberof xunxian.player
             * @classdesc Represents a GetPlayerRequest.
             * @implements IGetPlayerRequest
             * @constructor
             * @param {xunxian.player.IGetPlayerRequest=} [properties] Properties to set
             */
            function GetPlayerRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * GetPlayerRequest playerId.
             * @member {number|Long} playerId
             * @memberof xunxian.player.GetPlayerRequest
             * @instance
             */
            GetPlayerRequest.prototype.playerId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Creates a new GetPlayerRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.player.GetPlayerRequest
             * @static
             * @param {xunxian.player.IGetPlayerRequest=} [properties] Properties to set
             * @returns {xunxian.player.GetPlayerRequest} GetPlayerRequest instance
             */
            GetPlayerRequest.create = function create(properties) {
                return new GetPlayerRequest(properties);
            };

            /**
             * Encodes the specified GetPlayerRequest message. Does not implicitly {@link xunxian.player.GetPlayerRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.player.GetPlayerRequest
             * @static
             * @param {xunxian.player.IGetPlayerRequest} message GetPlayerRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GetPlayerRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.playerId);
                return writer;
            };

            /**
             * Encodes the specified GetPlayerRequest message, length delimited. Does not implicitly {@link xunxian.player.GetPlayerRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.player.GetPlayerRequest
             * @static
             * @param {xunxian.player.IGetPlayerRequest} message GetPlayerRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GetPlayerRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a GetPlayerRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.player.GetPlayerRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.player.GetPlayerRequest} GetPlayerRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GetPlayerRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.player.GetPlayerRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.playerId = reader.int64();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a GetPlayerRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.player.GetPlayerRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.player.GetPlayerRequest} GetPlayerRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GetPlayerRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a GetPlayerRequest message.
             * @function verify
             * @memberof xunxian.player.GetPlayerRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            GetPlayerRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (!$util.isInteger(message.playerId) && !(message.playerId && $util.isInteger(message.playerId.low) && $util.isInteger(message.playerId.high)))
                        return "playerId: integer|Long expected";
                return null;
            };

            /**
             * Creates a GetPlayerRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.player.GetPlayerRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.player.GetPlayerRequest} GetPlayerRequest
             */
            GetPlayerRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.player.GetPlayerRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.player.GetPlayerRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.player.GetPlayerRequest();
                if (object.playerId != null)
                    if ($util.Long)
                        message.playerId = $util.Long.fromValue(object.playerId, false);
                    else if (typeof object.playerId === "string")
                        message.playerId = parseInt(object.playerId, 10);
                    else if (typeof object.playerId === "number")
                        message.playerId = object.playerId;
                    else if (typeof object.playerId === "object")
                        message.playerId = new $util.LongBits(object.playerId.low >>> 0, object.playerId.high >>> 0).toNumber();
                return message;
            };

            /**
             * Creates a plain object from a GetPlayerRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.player.GetPlayerRequest
             * @static
             * @param {xunxian.player.GetPlayerRequest} message GetPlayerRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            GetPlayerRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults)
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.playerId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.playerId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.playerId = typeof message.playerId === "number" ? BigInt(message.playerId) : $util.Long.fromBits(message.playerId.low >>> 0, message.playerId.high >>> 0, false).toBigInt();
                    else if (typeof message.playerId === "number")
                        object.playerId = options.longs === String ? String(message.playerId) : message.playerId;
                    else
                        object.playerId = options.longs === String ? $util.Long.prototype.toString.call(message.playerId) : options.longs === Number ? new $util.LongBits(message.playerId.low >>> 0, message.playerId.high >>> 0).toNumber() : message.playerId;
                return object;
            };

            /**
             * Converts this GetPlayerRequest to JSON.
             * @function toJSON
             * @memberof xunxian.player.GetPlayerRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            GetPlayerRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for GetPlayerRequest
             * @function getTypeUrl
             * @memberof xunxian.player.GetPlayerRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            GetPlayerRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.player.GetPlayerRequest";
            };

            return GetPlayerRequest;
        })();

        player.GetPlayerResponse = (function() {

            /**
             * Properties of a GetPlayerResponse.
             * @memberof xunxian.player
             * @interface IGetPlayerResponse
             * @property {number|null} [code] GetPlayerResponse code
             * @property {string|null} [msg] GetPlayerResponse msg
             * @property {xunxian.player.IPlayerInfo|null} [info] GetPlayerResponse info
             */

            /**
             * Constructs a new GetPlayerResponse.
             * @memberof xunxian.player
             * @classdesc Represents a GetPlayerResponse.
             * @implements IGetPlayerResponse
             * @constructor
             * @param {xunxian.player.IGetPlayerResponse=} [properties] Properties to set
             */
            function GetPlayerResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * GetPlayerResponse code.
             * @member {number} code
             * @memberof xunxian.player.GetPlayerResponse
             * @instance
             */
            GetPlayerResponse.prototype.code = 0;

            /**
             * GetPlayerResponse msg.
             * @member {string} msg
             * @memberof xunxian.player.GetPlayerResponse
             * @instance
             */
            GetPlayerResponse.prototype.msg = "";

            /**
             * GetPlayerResponse info.
             * @member {xunxian.player.IPlayerInfo|null|undefined} info
             * @memberof xunxian.player.GetPlayerResponse
             * @instance
             */
            GetPlayerResponse.prototype.info = null;

            /**
             * Creates a new GetPlayerResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.player.GetPlayerResponse
             * @static
             * @param {xunxian.player.IGetPlayerResponse=} [properties] Properties to set
             * @returns {xunxian.player.GetPlayerResponse} GetPlayerResponse instance
             */
            GetPlayerResponse.create = function create(properties) {
                return new GetPlayerResponse(properties);
            };

            /**
             * Encodes the specified GetPlayerResponse message. Does not implicitly {@link xunxian.player.GetPlayerResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.player.GetPlayerResponse
             * @static
             * @param {xunxian.player.IGetPlayerResponse} message GetPlayerResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GetPlayerResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.info != null && Object.hasOwnProperty.call(message, "info"))
                    $root.xunxian.player.PlayerInfo.encode(message.info, writer.uint32(/* id 3, wireType 2 =*/26).fork(), q + 1).ldelim();
                return writer;
            };

            /**
             * Encodes the specified GetPlayerResponse message, length delimited. Does not implicitly {@link xunxian.player.GetPlayerResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.player.GetPlayerResponse
             * @static
             * @param {xunxian.player.IGetPlayerResponse} message GetPlayerResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GetPlayerResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a GetPlayerResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.player.GetPlayerResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.player.GetPlayerResponse} GetPlayerResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GetPlayerResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.player.GetPlayerResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.info = $root.xunxian.player.PlayerInfo.decode(reader, reader.uint32(), undefined, long + 1);
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a GetPlayerResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.player.GetPlayerResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.player.GetPlayerResponse} GetPlayerResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GetPlayerResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a GetPlayerResponse message.
             * @function verify
             * @memberof xunxian.player.GetPlayerResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            GetPlayerResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.info != null && Object.hasOwnProperty.call(message, "info")) {
                    var error = $root.xunxian.player.PlayerInfo.verify(message.info, long + 1);
                    if (error)
                        return "info." + error;
                }
                return null;
            };

            /**
             * Creates a GetPlayerResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.player.GetPlayerResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.player.GetPlayerResponse} GetPlayerResponse
             */
            GetPlayerResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.player.GetPlayerResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.player.GetPlayerResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.player.GetPlayerResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.info != null) {
                    if (!$util.isObject(object.info))
                        throw TypeError(".xunxian.player.GetPlayerResponse.info: object expected");
                    message.info = $root.xunxian.player.PlayerInfo.fromObject(object.info, long + 1);
                }
                return message;
            };

            /**
             * Creates a plain object from a GetPlayerResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.player.GetPlayerResponse
             * @static
             * @param {xunxian.player.GetPlayerResponse} message GetPlayerResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            GetPlayerResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.info = null;
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.info != null && Object.hasOwnProperty.call(message, "info"))
                    object.info = $root.xunxian.player.PlayerInfo.toObject(message.info, options, q + 1);
                return object;
            };

            /**
             * Converts this GetPlayerResponse to JSON.
             * @function toJSON
             * @memberof xunxian.player.GetPlayerResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            GetPlayerResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for GetPlayerResponse
             * @function getTypeUrl
             * @memberof xunxian.player.GetPlayerResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            GetPlayerResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.player.GetPlayerResponse";
            };

            return GetPlayerResponse;
        })();

        player.GetPlayerAttrRequest = (function() {

            /**
             * Properties of a GetPlayerAttrRequest.
             * @memberof xunxian.player
             * @interface IGetPlayerAttrRequest
             * @property {number|Long|null} [playerId] GetPlayerAttrRequest playerId
             */

            /**
             * Constructs a new GetPlayerAttrRequest.
             * @memberof xunxian.player
             * @classdesc Represents a GetPlayerAttrRequest.
             * @implements IGetPlayerAttrRequest
             * @constructor
             * @param {xunxian.player.IGetPlayerAttrRequest=} [properties] Properties to set
             */
            function GetPlayerAttrRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * GetPlayerAttrRequest playerId.
             * @member {number|Long} playerId
             * @memberof xunxian.player.GetPlayerAttrRequest
             * @instance
             */
            GetPlayerAttrRequest.prototype.playerId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Creates a new GetPlayerAttrRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.player.GetPlayerAttrRequest
             * @static
             * @param {xunxian.player.IGetPlayerAttrRequest=} [properties] Properties to set
             * @returns {xunxian.player.GetPlayerAttrRequest} GetPlayerAttrRequest instance
             */
            GetPlayerAttrRequest.create = function create(properties) {
                return new GetPlayerAttrRequest(properties);
            };

            /**
             * Encodes the specified GetPlayerAttrRequest message. Does not implicitly {@link xunxian.player.GetPlayerAttrRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.player.GetPlayerAttrRequest
             * @static
             * @param {xunxian.player.IGetPlayerAttrRequest} message GetPlayerAttrRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GetPlayerAttrRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.playerId);
                return writer;
            };

            /**
             * Encodes the specified GetPlayerAttrRequest message, length delimited. Does not implicitly {@link xunxian.player.GetPlayerAttrRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.player.GetPlayerAttrRequest
             * @static
             * @param {xunxian.player.IGetPlayerAttrRequest} message GetPlayerAttrRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GetPlayerAttrRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a GetPlayerAttrRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.player.GetPlayerAttrRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.player.GetPlayerAttrRequest} GetPlayerAttrRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GetPlayerAttrRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.player.GetPlayerAttrRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.playerId = reader.int64();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a GetPlayerAttrRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.player.GetPlayerAttrRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.player.GetPlayerAttrRequest} GetPlayerAttrRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GetPlayerAttrRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a GetPlayerAttrRequest message.
             * @function verify
             * @memberof xunxian.player.GetPlayerAttrRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            GetPlayerAttrRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (!$util.isInteger(message.playerId) && !(message.playerId && $util.isInteger(message.playerId.low) && $util.isInteger(message.playerId.high)))
                        return "playerId: integer|Long expected";
                return null;
            };

            /**
             * Creates a GetPlayerAttrRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.player.GetPlayerAttrRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.player.GetPlayerAttrRequest} GetPlayerAttrRequest
             */
            GetPlayerAttrRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.player.GetPlayerAttrRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.player.GetPlayerAttrRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.player.GetPlayerAttrRequest();
                if (object.playerId != null)
                    if ($util.Long)
                        message.playerId = $util.Long.fromValue(object.playerId, false);
                    else if (typeof object.playerId === "string")
                        message.playerId = parseInt(object.playerId, 10);
                    else if (typeof object.playerId === "number")
                        message.playerId = object.playerId;
                    else if (typeof object.playerId === "object")
                        message.playerId = new $util.LongBits(object.playerId.low >>> 0, object.playerId.high >>> 0).toNumber();
                return message;
            };

            /**
             * Creates a plain object from a GetPlayerAttrRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.player.GetPlayerAttrRequest
             * @static
             * @param {xunxian.player.GetPlayerAttrRequest} message GetPlayerAttrRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            GetPlayerAttrRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults)
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.playerId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.playerId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.playerId = typeof message.playerId === "number" ? BigInt(message.playerId) : $util.Long.fromBits(message.playerId.low >>> 0, message.playerId.high >>> 0, false).toBigInt();
                    else if (typeof message.playerId === "number")
                        object.playerId = options.longs === String ? String(message.playerId) : message.playerId;
                    else
                        object.playerId = options.longs === String ? $util.Long.prototype.toString.call(message.playerId) : options.longs === Number ? new $util.LongBits(message.playerId.low >>> 0, message.playerId.high >>> 0).toNumber() : message.playerId;
                return object;
            };

            /**
             * Converts this GetPlayerAttrRequest to JSON.
             * @function toJSON
             * @memberof xunxian.player.GetPlayerAttrRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            GetPlayerAttrRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for GetPlayerAttrRequest
             * @function getTypeUrl
             * @memberof xunxian.player.GetPlayerAttrRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            GetPlayerAttrRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.player.GetPlayerAttrRequest";
            };

            return GetPlayerAttrRequest;
        })();

        player.GetPlayerAttrResponse = (function() {

            /**
             * Properties of a GetPlayerAttrResponse.
             * @memberof xunxian.player
             * @interface IGetPlayerAttrResponse
             * @property {number|null} [code] GetPlayerAttrResponse code
             * @property {string|null} [msg] GetPlayerAttrResponse msg
             * @property {xunxian.player.IPlayerAttrs|null} [attrs] GetPlayerAttrResponse attrs
             * @property {xunxian.player.IHiddenAttrs|null} [hiddenAttrs] GetPlayerAttrResponse hiddenAttrs
             */

            /**
             * Constructs a new GetPlayerAttrResponse.
             * @memberof xunxian.player
             * @classdesc Represents a GetPlayerAttrResponse.
             * @implements IGetPlayerAttrResponse
             * @constructor
             * @param {xunxian.player.IGetPlayerAttrResponse=} [properties] Properties to set
             */
            function GetPlayerAttrResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * GetPlayerAttrResponse code.
             * @member {number} code
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @instance
             */
            GetPlayerAttrResponse.prototype.code = 0;

            /**
             * GetPlayerAttrResponse msg.
             * @member {string} msg
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @instance
             */
            GetPlayerAttrResponse.prototype.msg = "";

            /**
             * GetPlayerAttrResponse attrs.
             * @member {xunxian.player.IPlayerAttrs|null|undefined} attrs
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @instance
             */
            GetPlayerAttrResponse.prototype.attrs = null;

            /**
             * GetPlayerAttrResponse hiddenAttrs.
             * @member {xunxian.player.IHiddenAttrs|null|undefined} hiddenAttrs
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @instance
             */
            GetPlayerAttrResponse.prototype.hiddenAttrs = null;

            /**
             * Creates a new GetPlayerAttrResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @static
             * @param {xunxian.player.IGetPlayerAttrResponse=} [properties] Properties to set
             * @returns {xunxian.player.GetPlayerAttrResponse} GetPlayerAttrResponse instance
             */
            GetPlayerAttrResponse.create = function create(properties) {
                return new GetPlayerAttrResponse(properties);
            };

            /**
             * Encodes the specified GetPlayerAttrResponse message. Does not implicitly {@link xunxian.player.GetPlayerAttrResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @static
             * @param {xunxian.player.IGetPlayerAttrResponse} message GetPlayerAttrResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GetPlayerAttrResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.attrs != null && Object.hasOwnProperty.call(message, "attrs"))
                    $root.xunxian.player.PlayerAttrs.encode(message.attrs, writer.uint32(/* id 3, wireType 2 =*/26).fork(), q + 1).ldelim();
                if (message.hiddenAttrs != null && Object.hasOwnProperty.call(message, "hiddenAttrs"))
                    $root.xunxian.player.HiddenAttrs.encode(message.hiddenAttrs, writer.uint32(/* id 4, wireType 2 =*/34).fork(), q + 1).ldelim();
                return writer;
            };

            /**
             * Encodes the specified GetPlayerAttrResponse message, length delimited. Does not implicitly {@link xunxian.player.GetPlayerAttrResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @static
             * @param {xunxian.player.IGetPlayerAttrResponse} message GetPlayerAttrResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            GetPlayerAttrResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a GetPlayerAttrResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.player.GetPlayerAttrResponse} GetPlayerAttrResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GetPlayerAttrResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.player.GetPlayerAttrResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.attrs = $root.xunxian.player.PlayerAttrs.decode(reader, reader.uint32(), undefined, long + 1);
                            break;
                        }
                    case 4: {
                            message.hiddenAttrs = $root.xunxian.player.HiddenAttrs.decode(reader, reader.uint32(), undefined, long + 1);
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a GetPlayerAttrResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.player.GetPlayerAttrResponse} GetPlayerAttrResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            GetPlayerAttrResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a GetPlayerAttrResponse message.
             * @function verify
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            GetPlayerAttrResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.attrs != null && Object.hasOwnProperty.call(message, "attrs")) {
                    var error = $root.xunxian.player.PlayerAttrs.verify(message.attrs, long + 1);
                    if (error)
                        return "attrs." + error;
                }
                if (message.hiddenAttrs != null && Object.hasOwnProperty.call(message, "hiddenAttrs")) {
                    var error = $root.xunxian.player.HiddenAttrs.verify(message.hiddenAttrs, long + 1);
                    if (error)
                        return "hiddenAttrs." + error;
                }
                return null;
            };

            /**
             * Creates a GetPlayerAttrResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.player.GetPlayerAttrResponse} GetPlayerAttrResponse
             */
            GetPlayerAttrResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.player.GetPlayerAttrResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.player.GetPlayerAttrResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.player.GetPlayerAttrResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.attrs != null) {
                    if (!$util.isObject(object.attrs))
                        throw TypeError(".xunxian.player.GetPlayerAttrResponse.attrs: object expected");
                    message.attrs = $root.xunxian.player.PlayerAttrs.fromObject(object.attrs, long + 1);
                }
                if (object.hiddenAttrs != null) {
                    if (!$util.isObject(object.hiddenAttrs))
                        throw TypeError(".xunxian.player.GetPlayerAttrResponse.hiddenAttrs: object expected");
                    message.hiddenAttrs = $root.xunxian.player.HiddenAttrs.fromObject(object.hiddenAttrs, long + 1);
                }
                return message;
            };

            /**
             * Creates a plain object from a GetPlayerAttrResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @static
             * @param {xunxian.player.GetPlayerAttrResponse} message GetPlayerAttrResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            GetPlayerAttrResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.attrs = null;
                    object.hiddenAttrs = null;
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.attrs != null && Object.hasOwnProperty.call(message, "attrs"))
                    object.attrs = $root.xunxian.player.PlayerAttrs.toObject(message.attrs, options, q + 1);
                if (message.hiddenAttrs != null && Object.hasOwnProperty.call(message, "hiddenAttrs"))
                    object.hiddenAttrs = $root.xunxian.player.HiddenAttrs.toObject(message.hiddenAttrs, options, q + 1);
                return object;
            };

            /**
             * Converts this GetPlayerAttrResponse to JSON.
             * @function toJSON
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            GetPlayerAttrResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for GetPlayerAttrResponse
             * @function getTypeUrl
             * @memberof xunxian.player.GetPlayerAttrResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            GetPlayerAttrResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.player.GetPlayerAttrResponse";
            };

            return GetPlayerAttrResponse;
        })();

        player.RandomNameRequest = (function() {

            /**
             * Properties of a RandomNameRequest.
             * @memberof xunxian.player
             * @interface IRandomNameRequest
             * @property {number|null} [gender] RandomNameRequest gender
             */

            /**
             * Constructs a new RandomNameRequest.
             * @memberof xunxian.player
             * @classdesc Represents a RandomNameRequest.
             * @implements IRandomNameRequest
             * @constructor
             * @param {xunxian.player.IRandomNameRequest=} [properties] Properties to set
             */
            function RandomNameRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * RandomNameRequest gender.
             * @member {number} gender
             * @memberof xunxian.player.RandomNameRequest
             * @instance
             */
            RandomNameRequest.prototype.gender = 0;

            /**
             * Creates a new RandomNameRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.player.RandomNameRequest
             * @static
             * @param {xunxian.player.IRandomNameRequest=} [properties] Properties to set
             * @returns {xunxian.player.RandomNameRequest} RandomNameRequest instance
             */
            RandomNameRequest.create = function create(properties) {
                return new RandomNameRequest(properties);
            };

            /**
             * Encodes the specified RandomNameRequest message. Does not implicitly {@link xunxian.player.RandomNameRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.player.RandomNameRequest
             * @static
             * @param {xunxian.player.IRandomNameRequest} message RandomNameRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RandomNameRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.gender);
                return writer;
            };

            /**
             * Encodes the specified RandomNameRequest message, length delimited. Does not implicitly {@link xunxian.player.RandomNameRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.player.RandomNameRequest
             * @static
             * @param {xunxian.player.IRandomNameRequest} message RandomNameRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RandomNameRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a RandomNameRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.player.RandomNameRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.player.RandomNameRequest} RandomNameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RandomNameRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.player.RandomNameRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.gender = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a RandomNameRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.player.RandomNameRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.player.RandomNameRequest} RandomNameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RandomNameRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a RandomNameRequest message.
             * @function verify
             * @memberof xunxian.player.RandomNameRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            RandomNameRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    if (!$util.isInteger(message.gender))
                        return "gender: integer expected";
                return null;
            };

            /**
             * Creates a RandomNameRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.player.RandomNameRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.player.RandomNameRequest} RandomNameRequest
             */
            RandomNameRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.player.RandomNameRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.player.RandomNameRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.player.RandomNameRequest();
                if (object.gender != null)
                    message.gender = object.gender | 0;
                return message;
            };

            /**
             * Creates a plain object from a RandomNameRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.player.RandomNameRequest
             * @static
             * @param {xunxian.player.RandomNameRequest} message RandomNameRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            RandomNameRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults)
                    object.gender = 0;
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    object.gender = message.gender;
                return object;
            };

            /**
             * Converts this RandomNameRequest to JSON.
             * @function toJSON
             * @memberof xunxian.player.RandomNameRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            RandomNameRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for RandomNameRequest
             * @function getTypeUrl
             * @memberof xunxian.player.RandomNameRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            RandomNameRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.player.RandomNameRequest";
            };

            return RandomNameRequest;
        })();

        player.RandomNameResponse = (function() {

            /**
             * Properties of a RandomNameResponse.
             * @memberof xunxian.player
             * @interface IRandomNameResponse
             * @property {number|null} [code] RandomNameResponse code
             * @property {string|null} [msg] RandomNameResponse msg
             * @property {string|null} [name] RandomNameResponse name
             */

            /**
             * Constructs a new RandomNameResponse.
             * @memberof xunxian.player
             * @classdesc Represents a RandomNameResponse.
             * @implements IRandomNameResponse
             * @constructor
             * @param {xunxian.player.IRandomNameResponse=} [properties] Properties to set
             */
            function RandomNameResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * RandomNameResponse code.
             * @member {number} code
             * @memberof xunxian.player.RandomNameResponse
             * @instance
             */
            RandomNameResponse.prototype.code = 0;

            /**
             * RandomNameResponse msg.
             * @member {string} msg
             * @memberof xunxian.player.RandomNameResponse
             * @instance
             */
            RandomNameResponse.prototype.msg = "";

            /**
             * RandomNameResponse name.
             * @member {string} name
             * @memberof xunxian.player.RandomNameResponse
             * @instance
             */
            RandomNameResponse.prototype.name = "";

            /**
             * Creates a new RandomNameResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.player.RandomNameResponse
             * @static
             * @param {xunxian.player.IRandomNameResponse=} [properties] Properties to set
             * @returns {xunxian.player.RandomNameResponse} RandomNameResponse instance
             */
            RandomNameResponse.create = function create(properties) {
                return new RandomNameResponse(properties);
            };

            /**
             * Encodes the specified RandomNameResponse message. Does not implicitly {@link xunxian.player.RandomNameResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.player.RandomNameResponse
             * @static
             * @param {xunxian.player.IRandomNameResponse} message RandomNameResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RandomNameResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.name);
                return writer;
            };

            /**
             * Encodes the specified RandomNameResponse message, length delimited. Does not implicitly {@link xunxian.player.RandomNameResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.player.RandomNameResponse
             * @static
             * @param {xunxian.player.IRandomNameResponse} message RandomNameResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RandomNameResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a RandomNameResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.player.RandomNameResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.player.RandomNameResponse} RandomNameResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RandomNameResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.player.RandomNameResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.name = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a RandomNameResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.player.RandomNameResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.player.RandomNameResponse} RandomNameResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RandomNameResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a RandomNameResponse message.
             * @function verify
             * @memberof xunxian.player.RandomNameResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            RandomNameResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    if (!$util.isString(message.name))
                        return "name: string expected";
                return null;
            };

            /**
             * Creates a RandomNameResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.player.RandomNameResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.player.RandomNameResponse} RandomNameResponse
             */
            RandomNameResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.player.RandomNameResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.player.RandomNameResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.player.RandomNameResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.name != null)
                    message.name = String(object.name);
                return message;
            };

            /**
             * Creates a plain object from a RandomNameResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.player.RandomNameResponse
             * @static
             * @param {xunxian.player.RandomNameResponse} message RandomNameResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            RandomNameResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.name = "";
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    object.name = message.name;
                return object;
            };

            /**
             * Converts this RandomNameResponse to JSON.
             * @function toJSON
             * @memberof xunxian.player.RandomNameResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            RandomNameResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for RandomNameResponse
             * @function getTypeUrl
             * @memberof xunxian.player.RandomNameResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            RandomNameResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.player.RandomNameResponse";
            };

            return RandomNameResponse;
        })();

        player.ValidateNameRequest = (function() {

            /**
             * Properties of a ValidateNameRequest.
             * @memberof xunxian.player
             * @interface IValidateNameRequest
             * @property {string|null} [name] ValidateNameRequest name
             */

            /**
             * Constructs a new ValidateNameRequest.
             * @memberof xunxian.player
             * @classdesc Represents a ValidateNameRequest.
             * @implements IValidateNameRequest
             * @constructor
             * @param {xunxian.player.IValidateNameRequest=} [properties] Properties to set
             */
            function ValidateNameRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ValidateNameRequest name.
             * @member {string} name
             * @memberof xunxian.player.ValidateNameRequest
             * @instance
             */
            ValidateNameRequest.prototype.name = "";

            /**
             * Creates a new ValidateNameRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.player.ValidateNameRequest
             * @static
             * @param {xunxian.player.IValidateNameRequest=} [properties] Properties to set
             * @returns {xunxian.player.ValidateNameRequest} ValidateNameRequest instance
             */
            ValidateNameRequest.create = function create(properties) {
                return new ValidateNameRequest(properties);
            };

            /**
             * Encodes the specified ValidateNameRequest message. Does not implicitly {@link xunxian.player.ValidateNameRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.player.ValidateNameRequest
             * @static
             * @param {xunxian.player.IValidateNameRequest} message ValidateNameRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ValidateNameRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
                return writer;
            };

            /**
             * Encodes the specified ValidateNameRequest message, length delimited. Does not implicitly {@link xunxian.player.ValidateNameRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.player.ValidateNameRequest
             * @static
             * @param {xunxian.player.IValidateNameRequest} message ValidateNameRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ValidateNameRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a ValidateNameRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.player.ValidateNameRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.player.ValidateNameRequest} ValidateNameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ValidateNameRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.player.ValidateNameRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.name = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ValidateNameRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.player.ValidateNameRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.player.ValidateNameRequest} ValidateNameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ValidateNameRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ValidateNameRequest message.
             * @function verify
             * @memberof xunxian.player.ValidateNameRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ValidateNameRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    if (!$util.isString(message.name))
                        return "name: string expected";
                return null;
            };

            /**
             * Creates a ValidateNameRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.player.ValidateNameRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.player.ValidateNameRequest} ValidateNameRequest
             */
            ValidateNameRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.player.ValidateNameRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.player.ValidateNameRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.player.ValidateNameRequest();
                if (object.name != null)
                    message.name = String(object.name);
                return message;
            };

            /**
             * Creates a plain object from a ValidateNameRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.player.ValidateNameRequest
             * @static
             * @param {xunxian.player.ValidateNameRequest} message ValidateNameRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ValidateNameRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults)
                    object.name = "";
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    object.name = message.name;
                return object;
            };

            /**
             * Converts this ValidateNameRequest to JSON.
             * @function toJSON
             * @memberof xunxian.player.ValidateNameRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ValidateNameRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ValidateNameRequest
             * @function getTypeUrl
             * @memberof xunxian.player.ValidateNameRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ValidateNameRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.player.ValidateNameRequest";
            };

            return ValidateNameRequest;
        })();

        player.ValidateNameResponse = (function() {

            /**
             * Properties of a ValidateNameResponse.
             * @memberof xunxian.player
             * @interface IValidateNameResponse
             * @property {number|null} [code] ValidateNameResponse code
             * @property {string|null} [msg] ValidateNameResponse msg
             * @property {boolean|null} [valid] ValidateNameResponse valid
             */

            /**
             * Constructs a new ValidateNameResponse.
             * @memberof xunxian.player
             * @classdesc Represents a ValidateNameResponse.
             * @implements IValidateNameResponse
             * @constructor
             * @param {xunxian.player.IValidateNameResponse=} [properties] Properties to set
             */
            function ValidateNameResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ValidateNameResponse code.
             * @member {number} code
             * @memberof xunxian.player.ValidateNameResponse
             * @instance
             */
            ValidateNameResponse.prototype.code = 0;

            /**
             * ValidateNameResponse msg.
             * @member {string} msg
             * @memberof xunxian.player.ValidateNameResponse
             * @instance
             */
            ValidateNameResponse.prototype.msg = "";

            /**
             * ValidateNameResponse valid.
             * @member {boolean} valid
             * @memberof xunxian.player.ValidateNameResponse
             * @instance
             */
            ValidateNameResponse.prototype.valid = false;

            /**
             * Creates a new ValidateNameResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.player.ValidateNameResponse
             * @static
             * @param {xunxian.player.IValidateNameResponse=} [properties] Properties to set
             * @returns {xunxian.player.ValidateNameResponse} ValidateNameResponse instance
             */
            ValidateNameResponse.create = function create(properties) {
                return new ValidateNameResponse(properties);
            };

            /**
             * Encodes the specified ValidateNameResponse message. Does not implicitly {@link xunxian.player.ValidateNameResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.player.ValidateNameResponse
             * @static
             * @param {xunxian.player.IValidateNameResponse} message ValidateNameResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ValidateNameResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.valid != null && Object.hasOwnProperty.call(message, "valid"))
                    writer.uint32(/* id 3, wireType 0 =*/24).bool(message.valid);
                return writer;
            };

            /**
             * Encodes the specified ValidateNameResponse message, length delimited. Does not implicitly {@link xunxian.player.ValidateNameResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.player.ValidateNameResponse
             * @static
             * @param {xunxian.player.IValidateNameResponse} message ValidateNameResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ValidateNameResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a ValidateNameResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.player.ValidateNameResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.player.ValidateNameResponse} ValidateNameResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ValidateNameResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.player.ValidateNameResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.valid = reader.bool();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ValidateNameResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.player.ValidateNameResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.player.ValidateNameResponse} ValidateNameResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ValidateNameResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ValidateNameResponse message.
             * @function verify
             * @memberof xunxian.player.ValidateNameResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ValidateNameResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.valid != null && Object.hasOwnProperty.call(message, "valid"))
                    if (typeof message.valid !== "boolean")
                        return "valid: boolean expected";
                return null;
            };

            /**
             * Creates a ValidateNameResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.player.ValidateNameResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.player.ValidateNameResponse} ValidateNameResponse
             */
            ValidateNameResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.player.ValidateNameResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.player.ValidateNameResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.player.ValidateNameResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.valid != null)
                    message.valid = Boolean(object.valid);
                return message;
            };

            /**
             * Creates a plain object from a ValidateNameResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.player.ValidateNameResponse
             * @static
             * @param {xunxian.player.ValidateNameResponse} message ValidateNameResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ValidateNameResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.valid = false;
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.valid != null && Object.hasOwnProperty.call(message, "valid"))
                    object.valid = message.valid;
                return object;
            };

            /**
             * Converts this ValidateNameResponse to JSON.
             * @function toJSON
             * @memberof xunxian.player.ValidateNameResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ValidateNameResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ValidateNameResponse
             * @function getTypeUrl
             * @memberof xunxian.player.ValidateNameResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ValidateNameResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.player.ValidateNameResponse";
            };

            return ValidateNameResponse;
        })();

        player.PlayerInfo = (function() {

            /**
             * Properties of a PlayerInfo.
             * @memberof xunxian.player
             * @interface IPlayerInfo
             * @property {number|Long|null} [playerId] PlayerInfo playerId
             * @property {number|Long|null} [accountId] PlayerInfo accountId
             * @property {string|null} [name] PlayerInfo name
             * @property {number|null} [gender] PlayerInfo gender
             * @property {number|null} [race] PlayerInfo race
             * @property {number|null} [levelStage] PlayerInfo levelStage
             * @property {number|null} [levelTier] PlayerInfo levelTier
             * @property {number|null} [levelStep] PlayerInfo levelStep
             * @property {number|null} [sceneId] PlayerInfo sceneId
             * @property {number|null} [posX] PlayerInfo posX
             * @property {number|null} [posY] PlayerInfo posY
             * @property {xunxian.player.IPlayerAttrs|null} [attrs] PlayerInfo attrs
             * @property {xunxian.player.IHiddenAttrs|null} [hiddenAttrs] PlayerInfo hiddenAttrs
             * @property {string|null} [status] PlayerInfo status
             */

            /**
             * Constructs a new PlayerInfo.
             * @memberof xunxian.player
             * @classdesc Represents a PlayerInfo.
             * @implements IPlayerInfo
             * @constructor
             * @param {xunxian.player.IPlayerInfo=} [properties] Properties to set
             */
            function PlayerInfo(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * PlayerInfo playerId.
             * @member {number|Long} playerId
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.playerId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * PlayerInfo accountId.
             * @member {number|Long} accountId
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.accountId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * PlayerInfo name.
             * @member {string} name
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.name = "";

            /**
             * PlayerInfo gender.
             * @member {number} gender
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.gender = 0;

            /**
             * PlayerInfo race.
             * @member {number} race
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.race = 0;

            /**
             * PlayerInfo levelStage.
             * @member {number} levelStage
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.levelStage = 0;

            /**
             * PlayerInfo levelTier.
             * @member {number} levelTier
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.levelTier = 0;

            /**
             * PlayerInfo levelStep.
             * @member {number} levelStep
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.levelStep = 0;

            /**
             * PlayerInfo sceneId.
             * @member {number} sceneId
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.sceneId = 0;

            /**
             * PlayerInfo posX.
             * @member {number} posX
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.posX = 0;

            /**
             * PlayerInfo posY.
             * @member {number} posY
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.posY = 0;

            /**
             * PlayerInfo attrs.
             * @member {xunxian.player.IPlayerAttrs|null|undefined} attrs
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.attrs = null;

            /**
             * PlayerInfo hiddenAttrs.
             * @member {xunxian.player.IHiddenAttrs|null|undefined} hiddenAttrs
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.hiddenAttrs = null;

            /**
             * PlayerInfo status.
             * @member {string} status
             * @memberof xunxian.player.PlayerInfo
             * @instance
             */
            PlayerInfo.prototype.status = "";

            /**
             * Creates a new PlayerInfo instance using the specified properties.
             * @function create
             * @memberof xunxian.player.PlayerInfo
             * @static
             * @param {xunxian.player.IPlayerInfo=} [properties] Properties to set
             * @returns {xunxian.player.PlayerInfo} PlayerInfo instance
             */
            PlayerInfo.create = function create(properties) {
                return new PlayerInfo(properties);
            };

            /**
             * Encodes the specified PlayerInfo message. Does not implicitly {@link xunxian.player.PlayerInfo.verify|verify} messages.
             * @function encode
             * @memberof xunxian.player.PlayerInfo
             * @static
             * @param {xunxian.player.IPlayerInfo} message PlayerInfo message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PlayerInfo.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.playerId);
                if (message.accountId != null && Object.hasOwnProperty.call(message, "accountId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int64(message.accountId);
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.name);
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    writer.uint32(/* id 4, wireType 0 =*/32).int32(message.gender);
                if (message.race != null && Object.hasOwnProperty.call(message, "race"))
                    writer.uint32(/* id 5, wireType 0 =*/40).int32(message.race);
                if (message.levelStage != null && Object.hasOwnProperty.call(message, "levelStage"))
                    writer.uint32(/* id 6, wireType 0 =*/48).int32(message.levelStage);
                if (message.levelTier != null && Object.hasOwnProperty.call(message, "levelTier"))
                    writer.uint32(/* id 7, wireType 0 =*/56).int32(message.levelTier);
                if (message.levelStep != null && Object.hasOwnProperty.call(message, "levelStep"))
                    writer.uint32(/* id 8, wireType 0 =*/64).int32(message.levelStep);
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    writer.uint32(/* id 9, wireType 0 =*/72).int32(message.sceneId);
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    writer.uint32(/* id 10, wireType 5 =*/85).float(message.posX);
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    writer.uint32(/* id 11, wireType 5 =*/93).float(message.posY);
                if (message.attrs != null && Object.hasOwnProperty.call(message, "attrs"))
                    $root.xunxian.player.PlayerAttrs.encode(message.attrs, writer.uint32(/* id 12, wireType 2 =*/98).fork(), q + 1).ldelim();
                if (message.hiddenAttrs != null && Object.hasOwnProperty.call(message, "hiddenAttrs"))
                    $root.xunxian.player.HiddenAttrs.encode(message.hiddenAttrs, writer.uint32(/* id 13, wireType 2 =*/106).fork(), q + 1).ldelim();
                if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                    writer.uint32(/* id 14, wireType 2 =*/114).string(message.status);
                return writer;
            };

            /**
             * Encodes the specified PlayerInfo message, length delimited. Does not implicitly {@link xunxian.player.PlayerInfo.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.player.PlayerInfo
             * @static
             * @param {xunxian.player.IPlayerInfo} message PlayerInfo message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PlayerInfo.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a PlayerInfo message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.player.PlayerInfo
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.player.PlayerInfo} PlayerInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PlayerInfo.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.player.PlayerInfo();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.playerId = reader.int64();
                            break;
                        }
                    case 2: {
                            message.accountId = reader.int64();
                            break;
                        }
                    case 3: {
                            message.name = reader.string();
                            break;
                        }
                    case 4: {
                            message.gender = reader.int32();
                            break;
                        }
                    case 5: {
                            message.race = reader.int32();
                            break;
                        }
                    case 6: {
                            message.levelStage = reader.int32();
                            break;
                        }
                    case 7: {
                            message.levelTier = reader.int32();
                            break;
                        }
                    case 8: {
                            message.levelStep = reader.int32();
                            break;
                        }
                    case 9: {
                            message.sceneId = reader.int32();
                            break;
                        }
                    case 10: {
                            message.posX = reader.float();
                            break;
                        }
                    case 11: {
                            message.posY = reader.float();
                            break;
                        }
                    case 12: {
                            message.attrs = $root.xunxian.player.PlayerAttrs.decode(reader, reader.uint32(), undefined, long + 1);
                            break;
                        }
                    case 13: {
                            message.hiddenAttrs = $root.xunxian.player.HiddenAttrs.decode(reader, reader.uint32(), undefined, long + 1);
                            break;
                        }
                    case 14: {
                            message.status = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a PlayerInfo message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.player.PlayerInfo
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.player.PlayerInfo} PlayerInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PlayerInfo.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a PlayerInfo message.
             * @function verify
             * @memberof xunxian.player.PlayerInfo
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            PlayerInfo.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (!$util.isInteger(message.playerId) && !(message.playerId && $util.isInteger(message.playerId.low) && $util.isInteger(message.playerId.high)))
                        return "playerId: integer|Long expected";
                if (message.accountId != null && Object.hasOwnProperty.call(message, "accountId"))
                    if (!$util.isInteger(message.accountId) && !(message.accountId && $util.isInteger(message.accountId.low) && $util.isInteger(message.accountId.high)))
                        return "accountId: integer|Long expected";
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    if (!$util.isString(message.name))
                        return "name: string expected";
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    if (!$util.isInteger(message.gender))
                        return "gender: integer expected";
                if (message.race != null && Object.hasOwnProperty.call(message, "race"))
                    if (!$util.isInteger(message.race))
                        return "race: integer expected";
                if (message.levelStage != null && Object.hasOwnProperty.call(message, "levelStage"))
                    if (!$util.isInteger(message.levelStage))
                        return "levelStage: integer expected";
                if (message.levelTier != null && Object.hasOwnProperty.call(message, "levelTier"))
                    if (!$util.isInteger(message.levelTier))
                        return "levelTier: integer expected";
                if (message.levelStep != null && Object.hasOwnProperty.call(message, "levelStep"))
                    if (!$util.isInteger(message.levelStep))
                        return "levelStep: integer expected";
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    if (!$util.isInteger(message.sceneId))
                        return "sceneId: integer expected";
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    if (typeof message.posX !== "number")
                        return "posX: number expected";
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    if (typeof message.posY !== "number")
                        return "posY: number expected";
                if (message.attrs != null && Object.hasOwnProperty.call(message, "attrs")) {
                    var error = $root.xunxian.player.PlayerAttrs.verify(message.attrs, long + 1);
                    if (error)
                        return "attrs." + error;
                }
                if (message.hiddenAttrs != null && Object.hasOwnProperty.call(message, "hiddenAttrs")) {
                    var error = $root.xunxian.player.HiddenAttrs.verify(message.hiddenAttrs, long + 1);
                    if (error)
                        return "hiddenAttrs." + error;
                }
                if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                    if (!$util.isString(message.status))
                        return "status: string expected";
                return null;
            };

            /**
             * Creates a PlayerInfo message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.player.PlayerInfo
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.player.PlayerInfo} PlayerInfo
             */
            PlayerInfo.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.player.PlayerInfo)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.player.PlayerInfo: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.player.PlayerInfo();
                if (object.playerId != null)
                    if ($util.Long)
                        message.playerId = $util.Long.fromValue(object.playerId, false);
                    else if (typeof object.playerId === "string")
                        message.playerId = parseInt(object.playerId, 10);
                    else if (typeof object.playerId === "number")
                        message.playerId = object.playerId;
                    else if (typeof object.playerId === "object")
                        message.playerId = new $util.LongBits(object.playerId.low >>> 0, object.playerId.high >>> 0).toNumber();
                if (object.accountId != null)
                    if ($util.Long)
                        message.accountId = $util.Long.fromValue(object.accountId, false);
                    else if (typeof object.accountId === "string")
                        message.accountId = parseInt(object.accountId, 10);
                    else if (typeof object.accountId === "number")
                        message.accountId = object.accountId;
                    else if (typeof object.accountId === "object")
                        message.accountId = new $util.LongBits(object.accountId.low >>> 0, object.accountId.high >>> 0).toNumber();
                if (object.name != null)
                    message.name = String(object.name);
                if (object.gender != null)
                    message.gender = object.gender | 0;
                if (object.race != null)
                    message.race = object.race | 0;
                if (object.levelStage != null)
                    message.levelStage = object.levelStage | 0;
                if (object.levelTier != null)
                    message.levelTier = object.levelTier | 0;
                if (object.levelStep != null)
                    message.levelStep = object.levelStep | 0;
                if (object.sceneId != null)
                    message.sceneId = object.sceneId | 0;
                if (object.posX != null)
                    message.posX = Number(object.posX);
                if (object.posY != null)
                    message.posY = Number(object.posY);
                if (object.attrs != null) {
                    if (!$util.isObject(object.attrs))
                        throw TypeError(".xunxian.player.PlayerInfo.attrs: object expected");
                    message.attrs = $root.xunxian.player.PlayerAttrs.fromObject(object.attrs, long + 1);
                }
                if (object.hiddenAttrs != null) {
                    if (!$util.isObject(object.hiddenAttrs))
                        throw TypeError(".xunxian.player.PlayerInfo.hiddenAttrs: object expected");
                    message.hiddenAttrs = $root.xunxian.player.HiddenAttrs.fromObject(object.hiddenAttrs, long + 1);
                }
                if (object.status != null)
                    message.status = String(object.status);
                return message;
            };

            /**
             * Creates a plain object from a PlayerInfo message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.player.PlayerInfo
             * @static
             * @param {xunxian.player.PlayerInfo} message PlayerInfo
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            PlayerInfo.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.playerId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.playerId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.accountId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.accountId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                    object.name = "";
                    object.gender = 0;
                    object.race = 0;
                    object.levelStage = 0;
                    object.levelTier = 0;
                    object.levelStep = 0;
                    object.sceneId = 0;
                    object.posX = 0;
                    object.posY = 0;
                    object.attrs = null;
                    object.hiddenAttrs = null;
                    object.status = "";
                }
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.playerId = typeof message.playerId === "number" ? BigInt(message.playerId) : $util.Long.fromBits(message.playerId.low >>> 0, message.playerId.high >>> 0, false).toBigInt();
                    else if (typeof message.playerId === "number")
                        object.playerId = options.longs === String ? String(message.playerId) : message.playerId;
                    else
                        object.playerId = options.longs === String ? $util.Long.prototype.toString.call(message.playerId) : options.longs === Number ? new $util.LongBits(message.playerId.low >>> 0, message.playerId.high >>> 0).toNumber() : message.playerId;
                if (message.accountId != null && Object.hasOwnProperty.call(message, "accountId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.accountId = typeof message.accountId === "number" ? BigInt(message.accountId) : $util.Long.fromBits(message.accountId.low >>> 0, message.accountId.high >>> 0, false).toBigInt();
                    else if (typeof message.accountId === "number")
                        object.accountId = options.longs === String ? String(message.accountId) : message.accountId;
                    else
                        object.accountId = options.longs === String ? $util.Long.prototype.toString.call(message.accountId) : options.longs === Number ? new $util.LongBits(message.accountId.low >>> 0, message.accountId.high >>> 0).toNumber() : message.accountId;
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    object.name = message.name;
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    object.gender = message.gender;
                if (message.race != null && Object.hasOwnProperty.call(message, "race"))
                    object.race = message.race;
                if (message.levelStage != null && Object.hasOwnProperty.call(message, "levelStage"))
                    object.levelStage = message.levelStage;
                if (message.levelTier != null && Object.hasOwnProperty.call(message, "levelTier"))
                    object.levelTier = message.levelTier;
                if (message.levelStep != null && Object.hasOwnProperty.call(message, "levelStep"))
                    object.levelStep = message.levelStep;
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    object.sceneId = message.sceneId;
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    object.posX = options.json && !isFinite(message.posX) ? String(message.posX) : message.posX;
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    object.posY = options.json && !isFinite(message.posY) ? String(message.posY) : message.posY;
                if (message.attrs != null && Object.hasOwnProperty.call(message, "attrs"))
                    object.attrs = $root.xunxian.player.PlayerAttrs.toObject(message.attrs, options, q + 1);
                if (message.hiddenAttrs != null && Object.hasOwnProperty.call(message, "hiddenAttrs"))
                    object.hiddenAttrs = $root.xunxian.player.HiddenAttrs.toObject(message.hiddenAttrs, options, q + 1);
                if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                    object.status = message.status;
                return object;
            };

            /**
             * Converts this PlayerInfo to JSON.
             * @function toJSON
             * @memberof xunxian.player.PlayerInfo
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            PlayerInfo.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for PlayerInfo
             * @function getTypeUrl
             * @memberof xunxian.player.PlayerInfo
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            PlayerInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.player.PlayerInfo";
            };

            return PlayerInfo;
        })();

        player.PlayerAttrs = (function() {

            /**
             * Properties of a PlayerAttrs.
             * @memberof xunxian.player
             * @interface IPlayerAttrs
             * @property {number|null} [jing] PlayerAttrs jing
             * @property {number|null} [qiMetal] PlayerAttrs qiMetal
             * @property {number|null} [qiWood] PlayerAttrs qiWood
             * @property {number|null} [qiWater] PlayerAttrs qiWater
             * @property {number|null} [qiFire] PlayerAttrs qiFire
             * @property {number|null} [qiEarth] PlayerAttrs qiEarth
             * @property {number|null} [shen] PlayerAttrs shen
             * @property {number|null} [luck] PlayerAttrs luck
             * @property {number|null} [savvy] PlayerAttrs savvy
             */

            /**
             * Constructs a new PlayerAttrs.
             * @memberof xunxian.player
             * @classdesc Represents a PlayerAttrs.
             * @implements IPlayerAttrs
             * @constructor
             * @param {xunxian.player.IPlayerAttrs=} [properties] Properties to set
             */
            function PlayerAttrs(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * PlayerAttrs jing.
             * @member {number} jing
             * @memberof xunxian.player.PlayerAttrs
             * @instance
             */
            PlayerAttrs.prototype.jing = 0;

            /**
             * PlayerAttrs qiMetal.
             * @member {number} qiMetal
             * @memberof xunxian.player.PlayerAttrs
             * @instance
             */
            PlayerAttrs.prototype.qiMetal = 0;

            /**
             * PlayerAttrs qiWood.
             * @member {number} qiWood
             * @memberof xunxian.player.PlayerAttrs
             * @instance
             */
            PlayerAttrs.prototype.qiWood = 0;

            /**
             * PlayerAttrs qiWater.
             * @member {number} qiWater
             * @memberof xunxian.player.PlayerAttrs
             * @instance
             */
            PlayerAttrs.prototype.qiWater = 0;

            /**
             * PlayerAttrs qiFire.
             * @member {number} qiFire
             * @memberof xunxian.player.PlayerAttrs
             * @instance
             */
            PlayerAttrs.prototype.qiFire = 0;

            /**
             * PlayerAttrs qiEarth.
             * @member {number} qiEarth
             * @memberof xunxian.player.PlayerAttrs
             * @instance
             */
            PlayerAttrs.prototype.qiEarth = 0;

            /**
             * PlayerAttrs shen.
             * @member {number} shen
             * @memberof xunxian.player.PlayerAttrs
             * @instance
             */
            PlayerAttrs.prototype.shen = 0;

            /**
             * PlayerAttrs luck.
             * @member {number} luck
             * @memberof xunxian.player.PlayerAttrs
             * @instance
             */
            PlayerAttrs.prototype.luck = 0;

            /**
             * PlayerAttrs savvy.
             * @member {number} savvy
             * @memberof xunxian.player.PlayerAttrs
             * @instance
             */
            PlayerAttrs.prototype.savvy = 0;

            /**
             * Creates a new PlayerAttrs instance using the specified properties.
             * @function create
             * @memberof xunxian.player.PlayerAttrs
             * @static
             * @param {xunxian.player.IPlayerAttrs=} [properties] Properties to set
             * @returns {xunxian.player.PlayerAttrs} PlayerAttrs instance
             */
            PlayerAttrs.create = function create(properties) {
                return new PlayerAttrs(properties);
            };

            /**
             * Encodes the specified PlayerAttrs message. Does not implicitly {@link xunxian.player.PlayerAttrs.verify|verify} messages.
             * @function encode
             * @memberof xunxian.player.PlayerAttrs
             * @static
             * @param {xunxian.player.IPlayerAttrs} message PlayerAttrs message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PlayerAttrs.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.jing != null && Object.hasOwnProperty.call(message, "jing"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.jing);
                if (message.qiMetal != null && Object.hasOwnProperty.call(message, "qiMetal"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.qiMetal);
                if (message.qiWood != null && Object.hasOwnProperty.call(message, "qiWood"))
                    writer.uint32(/* id 3, wireType 0 =*/24).int32(message.qiWood);
                if (message.qiWater != null && Object.hasOwnProperty.call(message, "qiWater"))
                    writer.uint32(/* id 4, wireType 0 =*/32).int32(message.qiWater);
                if (message.qiFire != null && Object.hasOwnProperty.call(message, "qiFire"))
                    writer.uint32(/* id 5, wireType 0 =*/40).int32(message.qiFire);
                if (message.qiEarth != null && Object.hasOwnProperty.call(message, "qiEarth"))
                    writer.uint32(/* id 6, wireType 0 =*/48).int32(message.qiEarth);
                if (message.shen != null && Object.hasOwnProperty.call(message, "shen"))
                    writer.uint32(/* id 7, wireType 0 =*/56).int32(message.shen);
                if (message.luck != null && Object.hasOwnProperty.call(message, "luck"))
                    writer.uint32(/* id 8, wireType 1 =*/65).double(message.luck);
                if (message.savvy != null && Object.hasOwnProperty.call(message, "savvy"))
                    writer.uint32(/* id 9, wireType 1 =*/73).double(message.savvy);
                return writer;
            };

            /**
             * Encodes the specified PlayerAttrs message, length delimited. Does not implicitly {@link xunxian.player.PlayerAttrs.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.player.PlayerAttrs
             * @static
             * @param {xunxian.player.IPlayerAttrs} message PlayerAttrs message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PlayerAttrs.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a PlayerAttrs message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.player.PlayerAttrs
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.player.PlayerAttrs} PlayerAttrs
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PlayerAttrs.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.player.PlayerAttrs();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.jing = reader.int32();
                            break;
                        }
                    case 2: {
                            message.qiMetal = reader.int32();
                            break;
                        }
                    case 3: {
                            message.qiWood = reader.int32();
                            break;
                        }
                    case 4: {
                            message.qiWater = reader.int32();
                            break;
                        }
                    case 5: {
                            message.qiFire = reader.int32();
                            break;
                        }
                    case 6: {
                            message.qiEarth = reader.int32();
                            break;
                        }
                    case 7: {
                            message.shen = reader.int32();
                            break;
                        }
                    case 8: {
                            message.luck = reader.double();
                            break;
                        }
                    case 9: {
                            message.savvy = reader.double();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a PlayerAttrs message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.player.PlayerAttrs
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.player.PlayerAttrs} PlayerAttrs
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PlayerAttrs.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a PlayerAttrs message.
             * @function verify
             * @memberof xunxian.player.PlayerAttrs
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            PlayerAttrs.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.jing != null && Object.hasOwnProperty.call(message, "jing"))
                    if (!$util.isInteger(message.jing))
                        return "jing: integer expected";
                if (message.qiMetal != null && Object.hasOwnProperty.call(message, "qiMetal"))
                    if (!$util.isInteger(message.qiMetal))
                        return "qiMetal: integer expected";
                if (message.qiWood != null && Object.hasOwnProperty.call(message, "qiWood"))
                    if (!$util.isInteger(message.qiWood))
                        return "qiWood: integer expected";
                if (message.qiWater != null && Object.hasOwnProperty.call(message, "qiWater"))
                    if (!$util.isInteger(message.qiWater))
                        return "qiWater: integer expected";
                if (message.qiFire != null && Object.hasOwnProperty.call(message, "qiFire"))
                    if (!$util.isInteger(message.qiFire))
                        return "qiFire: integer expected";
                if (message.qiEarth != null && Object.hasOwnProperty.call(message, "qiEarth"))
                    if (!$util.isInteger(message.qiEarth))
                        return "qiEarth: integer expected";
                if (message.shen != null && Object.hasOwnProperty.call(message, "shen"))
                    if (!$util.isInteger(message.shen))
                        return "shen: integer expected";
                if (message.luck != null && Object.hasOwnProperty.call(message, "luck"))
                    if (typeof message.luck !== "number")
                        return "luck: number expected";
                if (message.savvy != null && Object.hasOwnProperty.call(message, "savvy"))
                    if (typeof message.savvy !== "number")
                        return "savvy: number expected";
                return null;
            };

            /**
             * Creates a PlayerAttrs message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.player.PlayerAttrs
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.player.PlayerAttrs} PlayerAttrs
             */
            PlayerAttrs.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.player.PlayerAttrs)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.player.PlayerAttrs: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.player.PlayerAttrs();
                if (object.jing != null)
                    message.jing = object.jing | 0;
                if (object.qiMetal != null)
                    message.qiMetal = object.qiMetal | 0;
                if (object.qiWood != null)
                    message.qiWood = object.qiWood | 0;
                if (object.qiWater != null)
                    message.qiWater = object.qiWater | 0;
                if (object.qiFire != null)
                    message.qiFire = object.qiFire | 0;
                if (object.qiEarth != null)
                    message.qiEarth = object.qiEarth | 0;
                if (object.shen != null)
                    message.shen = object.shen | 0;
                if (object.luck != null)
                    message.luck = Number(object.luck);
                if (object.savvy != null)
                    message.savvy = Number(object.savvy);
                return message;
            };

            /**
             * Creates a plain object from a PlayerAttrs message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.player.PlayerAttrs
             * @static
             * @param {xunxian.player.PlayerAttrs} message PlayerAttrs
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            PlayerAttrs.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.jing = 0;
                    object.qiMetal = 0;
                    object.qiWood = 0;
                    object.qiWater = 0;
                    object.qiFire = 0;
                    object.qiEarth = 0;
                    object.shen = 0;
                    object.luck = 0;
                    object.savvy = 0;
                }
                if (message.jing != null && Object.hasOwnProperty.call(message, "jing"))
                    object.jing = message.jing;
                if (message.qiMetal != null && Object.hasOwnProperty.call(message, "qiMetal"))
                    object.qiMetal = message.qiMetal;
                if (message.qiWood != null && Object.hasOwnProperty.call(message, "qiWood"))
                    object.qiWood = message.qiWood;
                if (message.qiWater != null && Object.hasOwnProperty.call(message, "qiWater"))
                    object.qiWater = message.qiWater;
                if (message.qiFire != null && Object.hasOwnProperty.call(message, "qiFire"))
                    object.qiFire = message.qiFire;
                if (message.qiEarth != null && Object.hasOwnProperty.call(message, "qiEarth"))
                    object.qiEarth = message.qiEarth;
                if (message.shen != null && Object.hasOwnProperty.call(message, "shen"))
                    object.shen = message.shen;
                if (message.luck != null && Object.hasOwnProperty.call(message, "luck"))
                    object.luck = options.json && !isFinite(message.luck) ? String(message.luck) : message.luck;
                if (message.savvy != null && Object.hasOwnProperty.call(message, "savvy"))
                    object.savvy = options.json && !isFinite(message.savvy) ? String(message.savvy) : message.savvy;
                return object;
            };

            /**
             * Converts this PlayerAttrs to JSON.
             * @function toJSON
             * @memberof xunxian.player.PlayerAttrs
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            PlayerAttrs.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for PlayerAttrs
             * @function getTypeUrl
             * @memberof xunxian.player.PlayerAttrs
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            PlayerAttrs.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.player.PlayerAttrs";
            };

            return PlayerAttrs;
        })();

        player.HiddenAttrs = (function() {

            /**
             * Properties of a HiddenAttrs.
             * @memberof xunxian.player
             * @interface IHiddenAttrs
             * @property {number|null} [causality] HiddenAttrs causality
             * @property {number|null} [innerDemon] HiddenAttrs innerDemon
             * @property {number|null} [daoAge] HiddenAttrs daoAge
             * @property {number|null} [tribulationCount] HiddenAttrs tribulationCount
             */

            /**
             * Constructs a new HiddenAttrs.
             * @memberof xunxian.player
             * @classdesc Represents a HiddenAttrs.
             * @implements IHiddenAttrs
             * @constructor
             * @param {xunxian.player.IHiddenAttrs=} [properties] Properties to set
             */
            function HiddenAttrs(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * HiddenAttrs causality.
             * @member {number} causality
             * @memberof xunxian.player.HiddenAttrs
             * @instance
             */
            HiddenAttrs.prototype.causality = 0;

            /**
             * HiddenAttrs innerDemon.
             * @member {number} innerDemon
             * @memberof xunxian.player.HiddenAttrs
             * @instance
             */
            HiddenAttrs.prototype.innerDemon = 0;

            /**
             * HiddenAttrs daoAge.
             * @member {number} daoAge
             * @memberof xunxian.player.HiddenAttrs
             * @instance
             */
            HiddenAttrs.prototype.daoAge = 0;

            /**
             * HiddenAttrs tribulationCount.
             * @member {number} tribulationCount
             * @memberof xunxian.player.HiddenAttrs
             * @instance
             */
            HiddenAttrs.prototype.tribulationCount = 0;

            /**
             * Creates a new HiddenAttrs instance using the specified properties.
             * @function create
             * @memberof xunxian.player.HiddenAttrs
             * @static
             * @param {xunxian.player.IHiddenAttrs=} [properties] Properties to set
             * @returns {xunxian.player.HiddenAttrs} HiddenAttrs instance
             */
            HiddenAttrs.create = function create(properties) {
                return new HiddenAttrs(properties);
            };

            /**
             * Encodes the specified HiddenAttrs message. Does not implicitly {@link xunxian.player.HiddenAttrs.verify|verify} messages.
             * @function encode
             * @memberof xunxian.player.HiddenAttrs
             * @static
             * @param {xunxian.player.IHiddenAttrs} message HiddenAttrs message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            HiddenAttrs.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.causality != null && Object.hasOwnProperty.call(message, "causality"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.causality);
                if (message.innerDemon != null && Object.hasOwnProperty.call(message, "innerDemon"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.innerDemon);
                if (message.daoAge != null && Object.hasOwnProperty.call(message, "daoAge"))
                    writer.uint32(/* id 3, wireType 0 =*/24).int32(message.daoAge);
                if (message.tribulationCount != null && Object.hasOwnProperty.call(message, "tribulationCount"))
                    writer.uint32(/* id 4, wireType 0 =*/32).int32(message.tribulationCount);
                return writer;
            };

            /**
             * Encodes the specified HiddenAttrs message, length delimited. Does not implicitly {@link xunxian.player.HiddenAttrs.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.player.HiddenAttrs
             * @static
             * @param {xunxian.player.IHiddenAttrs} message HiddenAttrs message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            HiddenAttrs.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a HiddenAttrs message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.player.HiddenAttrs
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.player.HiddenAttrs} HiddenAttrs
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            HiddenAttrs.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.player.HiddenAttrs();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.causality = reader.int32();
                            break;
                        }
                    case 2: {
                            message.innerDemon = reader.int32();
                            break;
                        }
                    case 3: {
                            message.daoAge = reader.int32();
                            break;
                        }
                    case 4: {
                            message.tribulationCount = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a HiddenAttrs message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.player.HiddenAttrs
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.player.HiddenAttrs} HiddenAttrs
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            HiddenAttrs.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a HiddenAttrs message.
             * @function verify
             * @memberof xunxian.player.HiddenAttrs
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            HiddenAttrs.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.causality != null && Object.hasOwnProperty.call(message, "causality"))
                    if (!$util.isInteger(message.causality))
                        return "causality: integer expected";
                if (message.innerDemon != null && Object.hasOwnProperty.call(message, "innerDemon"))
                    if (!$util.isInteger(message.innerDemon))
                        return "innerDemon: integer expected";
                if (message.daoAge != null && Object.hasOwnProperty.call(message, "daoAge"))
                    if (!$util.isInteger(message.daoAge))
                        return "daoAge: integer expected";
                if (message.tribulationCount != null && Object.hasOwnProperty.call(message, "tribulationCount"))
                    if (!$util.isInteger(message.tribulationCount))
                        return "tribulationCount: integer expected";
                return null;
            };

            /**
             * Creates a HiddenAttrs message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.player.HiddenAttrs
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.player.HiddenAttrs} HiddenAttrs
             */
            HiddenAttrs.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.player.HiddenAttrs)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.player.HiddenAttrs: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.player.HiddenAttrs();
                if (object.causality != null)
                    message.causality = object.causality | 0;
                if (object.innerDemon != null)
                    message.innerDemon = object.innerDemon | 0;
                if (object.daoAge != null)
                    message.daoAge = object.daoAge | 0;
                if (object.tribulationCount != null)
                    message.tribulationCount = object.tribulationCount | 0;
                return message;
            };

            /**
             * Creates a plain object from a HiddenAttrs message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.player.HiddenAttrs
             * @static
             * @param {xunxian.player.HiddenAttrs} message HiddenAttrs
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            HiddenAttrs.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.causality = 0;
                    object.innerDemon = 0;
                    object.daoAge = 0;
                    object.tribulationCount = 0;
                }
                if (message.causality != null && Object.hasOwnProperty.call(message, "causality"))
                    object.causality = message.causality;
                if (message.innerDemon != null && Object.hasOwnProperty.call(message, "innerDemon"))
                    object.innerDemon = message.innerDemon;
                if (message.daoAge != null && Object.hasOwnProperty.call(message, "daoAge"))
                    object.daoAge = message.daoAge;
                if (message.tribulationCount != null && Object.hasOwnProperty.call(message, "tribulationCount"))
                    object.tribulationCount = message.tribulationCount;
                return object;
            };

            /**
             * Converts this HiddenAttrs to JSON.
             * @function toJSON
             * @memberof xunxian.player.HiddenAttrs
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            HiddenAttrs.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for HiddenAttrs
             * @function getTypeUrl
             * @memberof xunxian.player.HiddenAttrs
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            HiddenAttrs.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.player.HiddenAttrs";
            };

            return HiddenAttrs;
        })();

        return player;
    })();

    xunxian.scene = (function() {

        /**
         * Namespace scene.
         * @memberof xunxian
         * @namespace
         */
        var scene = {};

        scene.EnterSceneRequest = (function() {

            /**
             * Properties of an EnterSceneRequest.
             * @memberof xunxian.scene
             * @interface IEnterSceneRequest
             * @property {number|Long|null} [playerId] EnterSceneRequest playerId
             * @property {number|null} [sceneId] EnterSceneRequest sceneId
             */

            /**
             * Constructs a new EnterSceneRequest.
             * @memberof xunxian.scene
             * @classdesc Represents an EnterSceneRequest.
             * @implements IEnterSceneRequest
             * @constructor
             * @param {xunxian.scene.IEnterSceneRequest=} [properties] Properties to set
             */
            function EnterSceneRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * EnterSceneRequest playerId.
             * @member {number|Long} playerId
             * @memberof xunxian.scene.EnterSceneRequest
             * @instance
             */
            EnterSceneRequest.prototype.playerId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * EnterSceneRequest sceneId.
             * @member {number} sceneId
             * @memberof xunxian.scene.EnterSceneRequest
             * @instance
             */
            EnterSceneRequest.prototype.sceneId = 0;

            /**
             * Creates a new EnterSceneRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.EnterSceneRequest
             * @static
             * @param {xunxian.scene.IEnterSceneRequest=} [properties] Properties to set
             * @returns {xunxian.scene.EnterSceneRequest} EnterSceneRequest instance
             */
            EnterSceneRequest.create = function create(properties) {
                return new EnterSceneRequest(properties);
            };

            /**
             * Encodes the specified EnterSceneRequest message. Does not implicitly {@link xunxian.scene.EnterSceneRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.EnterSceneRequest
             * @static
             * @param {xunxian.scene.IEnterSceneRequest} message EnterSceneRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EnterSceneRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.playerId);
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.sceneId);
                return writer;
            };

            /**
             * Encodes the specified EnterSceneRequest message, length delimited. Does not implicitly {@link xunxian.scene.EnterSceneRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.EnterSceneRequest
             * @static
             * @param {xunxian.scene.IEnterSceneRequest} message EnterSceneRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EnterSceneRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes an EnterSceneRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.EnterSceneRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.EnterSceneRequest} EnterSceneRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            EnterSceneRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.EnterSceneRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.playerId = reader.int64();
                            break;
                        }
                    case 2: {
                            message.sceneId = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an EnterSceneRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.EnterSceneRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.EnterSceneRequest} EnterSceneRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            EnterSceneRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an EnterSceneRequest message.
             * @function verify
             * @memberof xunxian.scene.EnterSceneRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            EnterSceneRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (!$util.isInteger(message.playerId) && !(message.playerId && $util.isInteger(message.playerId.low) && $util.isInteger(message.playerId.high)))
                        return "playerId: integer|Long expected";
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    if (!$util.isInteger(message.sceneId))
                        return "sceneId: integer expected";
                return null;
            };

            /**
             * Creates an EnterSceneRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.EnterSceneRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.EnterSceneRequest} EnterSceneRequest
             */
            EnterSceneRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.EnterSceneRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.EnterSceneRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.EnterSceneRequest();
                if (object.playerId != null)
                    if ($util.Long)
                        message.playerId = $util.Long.fromValue(object.playerId, false);
                    else if (typeof object.playerId === "string")
                        message.playerId = parseInt(object.playerId, 10);
                    else if (typeof object.playerId === "number")
                        message.playerId = object.playerId;
                    else if (typeof object.playerId === "object")
                        message.playerId = new $util.LongBits(object.playerId.low >>> 0, object.playerId.high >>> 0).toNumber();
                if (object.sceneId != null)
                    message.sceneId = object.sceneId | 0;
                return message;
            };

            /**
             * Creates a plain object from an EnterSceneRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.EnterSceneRequest
             * @static
             * @param {xunxian.scene.EnterSceneRequest} message EnterSceneRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            EnterSceneRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.playerId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.playerId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                    object.sceneId = 0;
                }
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.playerId = typeof message.playerId === "number" ? BigInt(message.playerId) : $util.Long.fromBits(message.playerId.low >>> 0, message.playerId.high >>> 0, false).toBigInt();
                    else if (typeof message.playerId === "number")
                        object.playerId = options.longs === String ? String(message.playerId) : message.playerId;
                    else
                        object.playerId = options.longs === String ? $util.Long.prototype.toString.call(message.playerId) : options.longs === Number ? new $util.LongBits(message.playerId.low >>> 0, message.playerId.high >>> 0).toNumber() : message.playerId;
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    object.sceneId = message.sceneId;
                return object;
            };

            /**
             * Converts this EnterSceneRequest to JSON.
             * @function toJSON
             * @memberof xunxian.scene.EnterSceneRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            EnterSceneRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for EnterSceneRequest
             * @function getTypeUrl
             * @memberof xunxian.scene.EnterSceneRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            EnterSceneRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.EnterSceneRequest";
            };

            return EnterSceneRequest;
        })();

        scene.EnterSceneResponse = (function() {

            /**
             * Properties of an EnterSceneResponse.
             * @memberof xunxian.scene
             * @interface IEnterSceneResponse
             * @property {number|null} [code] EnterSceneResponse code
             * @property {string|null} [msg] EnterSceneResponse msg
             * @property {Array.<xunxian.scene.IEntityState>|null} [entities] EnterSceneResponse entities
             * @property {number|null} [posX] EnterSceneResponse posX
             * @property {number|null} [posY] EnterSceneResponse posY
             */

            /**
             * Constructs a new EnterSceneResponse.
             * @memberof xunxian.scene
             * @classdesc Represents an EnterSceneResponse.
             * @implements IEnterSceneResponse
             * @constructor
             * @param {xunxian.scene.IEnterSceneResponse=} [properties] Properties to set
             */
            function EnterSceneResponse(properties) {
                this.entities = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * EnterSceneResponse code.
             * @member {number} code
             * @memberof xunxian.scene.EnterSceneResponse
             * @instance
             */
            EnterSceneResponse.prototype.code = 0;

            /**
             * EnterSceneResponse msg.
             * @member {string} msg
             * @memberof xunxian.scene.EnterSceneResponse
             * @instance
             */
            EnterSceneResponse.prototype.msg = "";

            /**
             * EnterSceneResponse entities.
             * @member {Array.<xunxian.scene.IEntityState>} entities
             * @memberof xunxian.scene.EnterSceneResponse
             * @instance
             */
            EnterSceneResponse.prototype.entities = $util.emptyArray;

            /**
             * EnterSceneResponse posX.
             * @member {number} posX
             * @memberof xunxian.scene.EnterSceneResponse
             * @instance
             */
            EnterSceneResponse.prototype.posX = 0;

            /**
             * EnterSceneResponse posY.
             * @member {number} posY
             * @memberof xunxian.scene.EnterSceneResponse
             * @instance
             */
            EnterSceneResponse.prototype.posY = 0;

            /**
             * Creates a new EnterSceneResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.EnterSceneResponse
             * @static
             * @param {xunxian.scene.IEnterSceneResponse=} [properties] Properties to set
             * @returns {xunxian.scene.EnterSceneResponse} EnterSceneResponse instance
             */
            EnterSceneResponse.create = function create(properties) {
                return new EnterSceneResponse(properties);
            };

            /**
             * Encodes the specified EnterSceneResponse message. Does not implicitly {@link xunxian.scene.EnterSceneResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.EnterSceneResponse
             * @static
             * @param {xunxian.scene.IEnterSceneResponse} message EnterSceneResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EnterSceneResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.entities != null && message.entities.length)
                    for (var i = 0; i < message.entities.length; ++i)
                        $root.xunxian.scene.EntityState.encode(message.entities[i], writer.uint32(/* id 3, wireType 2 =*/26).fork(), q + 1).ldelim();
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    writer.uint32(/* id 4, wireType 5 =*/37).float(message.posX);
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    writer.uint32(/* id 5, wireType 5 =*/45).float(message.posY);
                return writer;
            };

            /**
             * Encodes the specified EnterSceneResponse message, length delimited. Does not implicitly {@link xunxian.scene.EnterSceneResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.EnterSceneResponse
             * @static
             * @param {xunxian.scene.IEnterSceneResponse} message EnterSceneResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EnterSceneResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes an EnterSceneResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.EnterSceneResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.EnterSceneResponse} EnterSceneResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            EnterSceneResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.EnterSceneResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            if (!(message.entities && message.entities.length))
                                message.entities = [];
                            message.entities.push($root.xunxian.scene.EntityState.decode(reader, reader.uint32(), undefined, long + 1));
                            break;
                        }
                    case 4: {
                            message.posX = reader.float();
                            break;
                        }
                    case 5: {
                            message.posY = reader.float();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an EnterSceneResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.EnterSceneResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.EnterSceneResponse} EnterSceneResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            EnterSceneResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an EnterSceneResponse message.
             * @function verify
             * @memberof xunxian.scene.EnterSceneResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            EnterSceneResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.entities != null && Object.hasOwnProperty.call(message, "entities")) {
                    if (!Array.isArray(message.entities))
                        return "entities: array expected";
                    for (var i = 0; i < message.entities.length; ++i) {
                        var error = $root.xunxian.scene.EntityState.verify(message.entities[i], long + 1);
                        if (error)
                            return "entities." + error;
                    }
                }
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    if (typeof message.posX !== "number")
                        return "posX: number expected";
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    if (typeof message.posY !== "number")
                        return "posY: number expected";
                return null;
            };

            /**
             * Creates an EnterSceneResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.EnterSceneResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.EnterSceneResponse} EnterSceneResponse
             */
            EnterSceneResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.EnterSceneResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.EnterSceneResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.EnterSceneResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.entities) {
                    if (!Array.isArray(object.entities))
                        throw TypeError(".xunxian.scene.EnterSceneResponse.entities: array expected");
                    message.entities = [];
                    for (var i = 0; i < object.entities.length; ++i) {
                        if (!$util.isObject(object.entities[i]))
                            throw TypeError(".xunxian.scene.EnterSceneResponse.entities: object expected");
                        message.entities[i] = $root.xunxian.scene.EntityState.fromObject(object.entities[i], long + 1);
                    }
                }
                if (object.posX != null)
                    message.posX = Number(object.posX);
                if (object.posY != null)
                    message.posY = Number(object.posY);
                return message;
            };

            /**
             * Creates a plain object from an EnterSceneResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.EnterSceneResponse
             * @static
             * @param {xunxian.scene.EnterSceneResponse} message EnterSceneResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            EnterSceneResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.arrays || options.defaults)
                    object.entities = [];
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.posX = 0;
                    object.posY = 0;
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.entities && message.entities.length) {
                    object.entities = [];
                    for (var j = 0; j < message.entities.length; ++j)
                        object.entities[j] = $root.xunxian.scene.EntityState.toObject(message.entities[j], options, q + 1);
                }
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    object.posX = options.json && !isFinite(message.posX) ? String(message.posX) : message.posX;
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    object.posY = options.json && !isFinite(message.posY) ? String(message.posY) : message.posY;
                return object;
            };

            /**
             * Converts this EnterSceneResponse to JSON.
             * @function toJSON
             * @memberof xunxian.scene.EnterSceneResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            EnterSceneResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for EnterSceneResponse
             * @function getTypeUrl
             * @memberof xunxian.scene.EnterSceneResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            EnterSceneResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.EnterSceneResponse";
            };

            return EnterSceneResponse;
        })();

        scene.LeaveSceneRequest = (function() {

            /**
             * Properties of a LeaveSceneRequest.
             * @memberof xunxian.scene
             * @interface ILeaveSceneRequest
             * @property {number|Long|null} [playerId] LeaveSceneRequest playerId
             * @property {number|null} [sceneId] LeaveSceneRequest sceneId
             */

            /**
             * Constructs a new LeaveSceneRequest.
             * @memberof xunxian.scene
             * @classdesc Represents a LeaveSceneRequest.
             * @implements ILeaveSceneRequest
             * @constructor
             * @param {xunxian.scene.ILeaveSceneRequest=} [properties] Properties to set
             */
            function LeaveSceneRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * LeaveSceneRequest playerId.
             * @member {number|Long} playerId
             * @memberof xunxian.scene.LeaveSceneRequest
             * @instance
             */
            LeaveSceneRequest.prototype.playerId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * LeaveSceneRequest sceneId.
             * @member {number} sceneId
             * @memberof xunxian.scene.LeaveSceneRequest
             * @instance
             */
            LeaveSceneRequest.prototype.sceneId = 0;

            /**
             * Creates a new LeaveSceneRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.LeaveSceneRequest
             * @static
             * @param {xunxian.scene.ILeaveSceneRequest=} [properties] Properties to set
             * @returns {xunxian.scene.LeaveSceneRequest} LeaveSceneRequest instance
             */
            LeaveSceneRequest.create = function create(properties) {
                return new LeaveSceneRequest(properties);
            };

            /**
             * Encodes the specified LeaveSceneRequest message. Does not implicitly {@link xunxian.scene.LeaveSceneRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.LeaveSceneRequest
             * @static
             * @param {xunxian.scene.ILeaveSceneRequest} message LeaveSceneRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            LeaveSceneRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.playerId);
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.sceneId);
                return writer;
            };

            /**
             * Encodes the specified LeaveSceneRequest message, length delimited. Does not implicitly {@link xunxian.scene.LeaveSceneRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.LeaveSceneRequest
             * @static
             * @param {xunxian.scene.ILeaveSceneRequest} message LeaveSceneRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            LeaveSceneRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a LeaveSceneRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.LeaveSceneRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.LeaveSceneRequest} LeaveSceneRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            LeaveSceneRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.LeaveSceneRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.playerId = reader.int64();
                            break;
                        }
                    case 2: {
                            message.sceneId = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a LeaveSceneRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.LeaveSceneRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.LeaveSceneRequest} LeaveSceneRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            LeaveSceneRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a LeaveSceneRequest message.
             * @function verify
             * @memberof xunxian.scene.LeaveSceneRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            LeaveSceneRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (!$util.isInteger(message.playerId) && !(message.playerId && $util.isInteger(message.playerId.low) && $util.isInteger(message.playerId.high)))
                        return "playerId: integer|Long expected";
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    if (!$util.isInteger(message.sceneId))
                        return "sceneId: integer expected";
                return null;
            };

            /**
             * Creates a LeaveSceneRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.LeaveSceneRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.LeaveSceneRequest} LeaveSceneRequest
             */
            LeaveSceneRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.LeaveSceneRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.LeaveSceneRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.LeaveSceneRequest();
                if (object.playerId != null)
                    if ($util.Long)
                        message.playerId = $util.Long.fromValue(object.playerId, false);
                    else if (typeof object.playerId === "string")
                        message.playerId = parseInt(object.playerId, 10);
                    else if (typeof object.playerId === "number")
                        message.playerId = object.playerId;
                    else if (typeof object.playerId === "object")
                        message.playerId = new $util.LongBits(object.playerId.low >>> 0, object.playerId.high >>> 0).toNumber();
                if (object.sceneId != null)
                    message.sceneId = object.sceneId | 0;
                return message;
            };

            /**
             * Creates a plain object from a LeaveSceneRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.LeaveSceneRequest
             * @static
             * @param {xunxian.scene.LeaveSceneRequest} message LeaveSceneRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            LeaveSceneRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.playerId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.playerId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                    object.sceneId = 0;
                }
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.playerId = typeof message.playerId === "number" ? BigInt(message.playerId) : $util.Long.fromBits(message.playerId.low >>> 0, message.playerId.high >>> 0, false).toBigInt();
                    else if (typeof message.playerId === "number")
                        object.playerId = options.longs === String ? String(message.playerId) : message.playerId;
                    else
                        object.playerId = options.longs === String ? $util.Long.prototype.toString.call(message.playerId) : options.longs === Number ? new $util.LongBits(message.playerId.low >>> 0, message.playerId.high >>> 0).toNumber() : message.playerId;
                if (message.sceneId != null && Object.hasOwnProperty.call(message, "sceneId"))
                    object.sceneId = message.sceneId;
                return object;
            };

            /**
             * Converts this LeaveSceneRequest to JSON.
             * @function toJSON
             * @memberof xunxian.scene.LeaveSceneRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            LeaveSceneRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for LeaveSceneRequest
             * @function getTypeUrl
             * @memberof xunxian.scene.LeaveSceneRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            LeaveSceneRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.LeaveSceneRequest";
            };

            return LeaveSceneRequest;
        })();

        scene.LeaveSceneResponse = (function() {

            /**
             * Properties of a LeaveSceneResponse.
             * @memberof xunxian.scene
             * @interface ILeaveSceneResponse
             * @property {number|null} [code] LeaveSceneResponse code
             * @property {string|null} [msg] LeaveSceneResponse msg
             */

            /**
             * Constructs a new LeaveSceneResponse.
             * @memberof xunxian.scene
             * @classdesc Represents a LeaveSceneResponse.
             * @implements ILeaveSceneResponse
             * @constructor
             * @param {xunxian.scene.ILeaveSceneResponse=} [properties] Properties to set
             */
            function LeaveSceneResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * LeaveSceneResponse code.
             * @member {number} code
             * @memberof xunxian.scene.LeaveSceneResponse
             * @instance
             */
            LeaveSceneResponse.prototype.code = 0;

            /**
             * LeaveSceneResponse msg.
             * @member {string} msg
             * @memberof xunxian.scene.LeaveSceneResponse
             * @instance
             */
            LeaveSceneResponse.prototype.msg = "";

            /**
             * Creates a new LeaveSceneResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.LeaveSceneResponse
             * @static
             * @param {xunxian.scene.ILeaveSceneResponse=} [properties] Properties to set
             * @returns {xunxian.scene.LeaveSceneResponse} LeaveSceneResponse instance
             */
            LeaveSceneResponse.create = function create(properties) {
                return new LeaveSceneResponse(properties);
            };

            /**
             * Encodes the specified LeaveSceneResponse message. Does not implicitly {@link xunxian.scene.LeaveSceneResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.LeaveSceneResponse
             * @static
             * @param {xunxian.scene.ILeaveSceneResponse} message LeaveSceneResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            LeaveSceneResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                return writer;
            };

            /**
             * Encodes the specified LeaveSceneResponse message, length delimited. Does not implicitly {@link xunxian.scene.LeaveSceneResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.LeaveSceneResponse
             * @static
             * @param {xunxian.scene.ILeaveSceneResponse} message LeaveSceneResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            LeaveSceneResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a LeaveSceneResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.LeaveSceneResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.LeaveSceneResponse} LeaveSceneResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            LeaveSceneResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.LeaveSceneResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a LeaveSceneResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.LeaveSceneResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.LeaveSceneResponse} LeaveSceneResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            LeaveSceneResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a LeaveSceneResponse message.
             * @function verify
             * @memberof xunxian.scene.LeaveSceneResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            LeaveSceneResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                return null;
            };

            /**
             * Creates a LeaveSceneResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.LeaveSceneResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.LeaveSceneResponse} LeaveSceneResponse
             */
            LeaveSceneResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.LeaveSceneResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.LeaveSceneResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.LeaveSceneResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                return message;
            };

            /**
             * Creates a plain object from a LeaveSceneResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.LeaveSceneResponse
             * @static
             * @param {xunxian.scene.LeaveSceneResponse} message LeaveSceneResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            LeaveSceneResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                return object;
            };

            /**
             * Converts this LeaveSceneResponse to JSON.
             * @function toJSON
             * @memberof xunxian.scene.LeaveSceneResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            LeaveSceneResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for LeaveSceneResponse
             * @function getTypeUrl
             * @memberof xunxian.scene.LeaveSceneResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            LeaveSceneResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.LeaveSceneResponse";
            };

            return LeaveSceneResponse;
        })();

        scene.MoveRequest = (function() {

            /**
             * Properties of a MoveRequest.
             * @memberof xunxian.scene
             * @interface IMoveRequest
             * @property {number|null} [x] MoveRequest x
             * @property {number|null} [y] MoveRequest y
             * @property {number|null} [seq] MoveRequest seq
             * @property {number|null} [dir] MoveRequest dir
             */

            /**
             * Constructs a new MoveRequest.
             * @memberof xunxian.scene
             * @classdesc Represents a MoveRequest.
             * @implements IMoveRequest
             * @constructor
             * @param {xunxian.scene.IMoveRequest=} [properties] Properties to set
             */
            function MoveRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * MoveRequest x.
             * @member {number} x
             * @memberof xunxian.scene.MoveRequest
             * @instance
             */
            MoveRequest.prototype.x = 0;

            /**
             * MoveRequest y.
             * @member {number} y
             * @memberof xunxian.scene.MoveRequest
             * @instance
             */
            MoveRequest.prototype.y = 0;

            /**
             * MoveRequest seq.
             * @member {number} seq
             * @memberof xunxian.scene.MoveRequest
             * @instance
             */
            MoveRequest.prototype.seq = 0;

            /**
             * MoveRequest dir.
             * @member {number} dir
             * @memberof xunxian.scene.MoveRequest
             * @instance
             */
            MoveRequest.prototype.dir = 0;

            /**
             * Creates a new MoveRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.MoveRequest
             * @static
             * @param {xunxian.scene.IMoveRequest=} [properties] Properties to set
             * @returns {xunxian.scene.MoveRequest} MoveRequest instance
             */
            MoveRequest.create = function create(properties) {
                return new MoveRequest(properties);
            };

            /**
             * Encodes the specified MoveRequest message. Does not implicitly {@link xunxian.scene.MoveRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.MoveRequest
             * @static
             * @param {xunxian.scene.IMoveRequest} message MoveRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            MoveRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.x != null && Object.hasOwnProperty.call(message, "x"))
                    writer.uint32(/* id 1, wireType 5 =*/13).float(message.x);
                if (message.y != null && Object.hasOwnProperty.call(message, "y"))
                    writer.uint32(/* id 2, wireType 5 =*/21).float(message.y);
                if (message.seq != null && Object.hasOwnProperty.call(message, "seq"))
                    writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.seq);
                if (message.dir != null && Object.hasOwnProperty.call(message, "dir"))
                    writer.uint32(/* id 4, wireType 0 =*/32).int32(message.dir);
                return writer;
            };

            /**
             * Encodes the specified MoveRequest message, length delimited. Does not implicitly {@link xunxian.scene.MoveRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.MoveRequest
             * @static
             * @param {xunxian.scene.IMoveRequest} message MoveRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            MoveRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a MoveRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.MoveRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.MoveRequest} MoveRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            MoveRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.MoveRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.x = reader.float();
                            break;
                        }
                    case 2: {
                            message.y = reader.float();
                            break;
                        }
                    case 3: {
                            message.seq = reader.uint32();
                            break;
                        }
                    case 4: {
                            message.dir = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a MoveRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.MoveRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.MoveRequest} MoveRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            MoveRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a MoveRequest message.
             * @function verify
             * @memberof xunxian.scene.MoveRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            MoveRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.x != null && Object.hasOwnProperty.call(message, "x"))
                    if (typeof message.x !== "number")
                        return "x: number expected";
                if (message.y != null && Object.hasOwnProperty.call(message, "y"))
                    if (typeof message.y !== "number")
                        return "y: number expected";
                if (message.seq != null && Object.hasOwnProperty.call(message, "seq"))
                    if (!$util.isInteger(message.seq))
                        return "seq: integer expected";
                if (message.dir != null && Object.hasOwnProperty.call(message, "dir"))
                    if (!$util.isInteger(message.dir))
                        return "dir: integer expected";
                return null;
            };

            /**
             * Creates a MoveRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.MoveRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.MoveRequest} MoveRequest
             */
            MoveRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.MoveRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.MoveRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.MoveRequest();
                if (object.x != null)
                    message.x = Number(object.x);
                if (object.y != null)
                    message.y = Number(object.y);
                if (object.seq != null)
                    message.seq = object.seq >>> 0;
                if (object.dir != null)
                    message.dir = object.dir | 0;
                return message;
            };

            /**
             * Creates a plain object from a MoveRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.MoveRequest
             * @static
             * @param {xunxian.scene.MoveRequest} message MoveRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            MoveRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.x = 0;
                    object.y = 0;
                    object.seq = 0;
                    object.dir = 0;
                }
                if (message.x != null && Object.hasOwnProperty.call(message, "x"))
                    object.x = options.json && !isFinite(message.x) ? String(message.x) : message.x;
                if (message.y != null && Object.hasOwnProperty.call(message, "y"))
                    object.y = options.json && !isFinite(message.y) ? String(message.y) : message.y;
                if (message.seq != null && Object.hasOwnProperty.call(message, "seq"))
                    object.seq = message.seq;
                if (message.dir != null && Object.hasOwnProperty.call(message, "dir"))
                    object.dir = message.dir;
                return object;
            };

            /**
             * Converts this MoveRequest to JSON.
             * @function toJSON
             * @memberof xunxian.scene.MoveRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            MoveRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for MoveRequest
             * @function getTypeUrl
             * @memberof xunxian.scene.MoveRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            MoveRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.MoveRequest";
            };

            return MoveRequest;
        })();

        scene.SyncFrame = (function() {

            /**
             * Properties of a SyncFrame.
             * @memberof xunxian.scene
             * @interface ISyncFrame
             * @property {Array.<xunxian.scene.IEntityState>|null} [entities] SyncFrame entities
             * @property {number|null} [serverSeq] SyncFrame serverSeq
             */

            /**
             * Constructs a new SyncFrame.
             * @memberof xunxian.scene
             * @classdesc Represents a SyncFrame.
             * @implements ISyncFrame
             * @constructor
             * @param {xunxian.scene.ISyncFrame=} [properties] Properties to set
             */
            function SyncFrame(properties) {
                this.entities = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * SyncFrame entities.
             * @member {Array.<xunxian.scene.IEntityState>} entities
             * @memberof xunxian.scene.SyncFrame
             * @instance
             */
            SyncFrame.prototype.entities = $util.emptyArray;

            /**
             * SyncFrame serverSeq.
             * @member {number} serverSeq
             * @memberof xunxian.scene.SyncFrame
             * @instance
             */
            SyncFrame.prototype.serverSeq = 0;

            /**
             * Creates a new SyncFrame instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.SyncFrame
             * @static
             * @param {xunxian.scene.ISyncFrame=} [properties] Properties to set
             * @returns {xunxian.scene.SyncFrame} SyncFrame instance
             */
            SyncFrame.create = function create(properties) {
                return new SyncFrame(properties);
            };

            /**
             * Encodes the specified SyncFrame message. Does not implicitly {@link xunxian.scene.SyncFrame.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.SyncFrame
             * @static
             * @param {xunxian.scene.ISyncFrame} message SyncFrame message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SyncFrame.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.entities != null && message.entities.length)
                    for (var i = 0; i < message.entities.length; ++i)
                        $root.xunxian.scene.EntityState.encode(message.entities[i], writer.uint32(/* id 1, wireType 2 =*/10).fork(), q + 1).ldelim();
                if (message.serverSeq != null && Object.hasOwnProperty.call(message, "serverSeq"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.serverSeq);
                return writer;
            };

            /**
             * Encodes the specified SyncFrame message, length delimited. Does not implicitly {@link xunxian.scene.SyncFrame.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.SyncFrame
             * @static
             * @param {xunxian.scene.ISyncFrame} message SyncFrame message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SyncFrame.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a SyncFrame message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.SyncFrame
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.SyncFrame} SyncFrame
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SyncFrame.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.SyncFrame();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            if (!(message.entities && message.entities.length))
                                message.entities = [];
                            message.entities.push($root.xunxian.scene.EntityState.decode(reader, reader.uint32(), undefined, long + 1));
                            break;
                        }
                    case 2: {
                            message.serverSeq = reader.uint32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a SyncFrame message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.SyncFrame
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.SyncFrame} SyncFrame
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SyncFrame.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SyncFrame message.
             * @function verify
             * @memberof xunxian.scene.SyncFrame
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SyncFrame.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.entities != null && Object.hasOwnProperty.call(message, "entities")) {
                    if (!Array.isArray(message.entities))
                        return "entities: array expected";
                    for (var i = 0; i < message.entities.length; ++i) {
                        var error = $root.xunxian.scene.EntityState.verify(message.entities[i], long + 1);
                        if (error)
                            return "entities." + error;
                    }
                }
                if (message.serverSeq != null && Object.hasOwnProperty.call(message, "serverSeq"))
                    if (!$util.isInteger(message.serverSeq))
                        return "serverSeq: integer expected";
                return null;
            };

            /**
             * Creates a SyncFrame message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.SyncFrame
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.SyncFrame} SyncFrame
             */
            SyncFrame.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.SyncFrame)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.SyncFrame: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.SyncFrame();
                if (object.entities) {
                    if (!Array.isArray(object.entities))
                        throw TypeError(".xunxian.scene.SyncFrame.entities: array expected");
                    message.entities = [];
                    for (var i = 0; i < object.entities.length; ++i) {
                        if (!$util.isObject(object.entities[i]))
                            throw TypeError(".xunxian.scene.SyncFrame.entities: object expected");
                        message.entities[i] = $root.xunxian.scene.EntityState.fromObject(object.entities[i], long + 1);
                    }
                }
                if (object.serverSeq != null)
                    message.serverSeq = object.serverSeq >>> 0;
                return message;
            };

            /**
             * Creates a plain object from a SyncFrame message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.SyncFrame
             * @static
             * @param {xunxian.scene.SyncFrame} message SyncFrame
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SyncFrame.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.arrays || options.defaults)
                    object.entities = [];
                if (options.defaults)
                    object.serverSeq = 0;
                if (message.entities && message.entities.length) {
                    object.entities = [];
                    for (var j = 0; j < message.entities.length; ++j)
                        object.entities[j] = $root.xunxian.scene.EntityState.toObject(message.entities[j], options, q + 1);
                }
                if (message.serverSeq != null && Object.hasOwnProperty.call(message, "serverSeq"))
                    object.serverSeq = message.serverSeq;
                return object;
            };

            /**
             * Converts this SyncFrame to JSON.
             * @function toJSON
             * @memberof xunxian.scene.SyncFrame
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SyncFrame.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SyncFrame
             * @function getTypeUrl
             * @memberof xunxian.scene.SyncFrame
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SyncFrame.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.SyncFrame";
            };

            return SyncFrame;
        })();

        scene.EntityState = (function() {

            /**
             * Properties of an EntityState.
             * @memberof xunxian.scene
             * @interface IEntityState
             * @property {number|Long|null} [entityId] EntityState entityId
             * @property {number|null} [x] EntityState x
             * @property {number|null} [y] EntityState y
             * @property {number|null} [dir] EntityState dir
             * @property {number|null} [action] EntityState action
             * @property {string|null} [name] EntityState name
             * @property {number|null} [entityType] EntityState entityType
             * @property {number|null} [gender] EntityState gender
             * @property {number|null} [levelStage] EntityState levelStage
             * @property {number|null} [levelTier] EntityState levelTier
             */

            /**
             * Constructs a new EntityState.
             * @memberof xunxian.scene
             * @classdesc Represents an EntityState.
             * @implements IEntityState
             * @constructor
             * @param {xunxian.scene.IEntityState=} [properties] Properties to set
             */
            function EntityState(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * EntityState entityId.
             * @member {number|Long} entityId
             * @memberof xunxian.scene.EntityState
             * @instance
             */
            EntityState.prototype.entityId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * EntityState x.
             * @member {number} x
             * @memberof xunxian.scene.EntityState
             * @instance
             */
            EntityState.prototype.x = 0;

            /**
             * EntityState y.
             * @member {number} y
             * @memberof xunxian.scene.EntityState
             * @instance
             */
            EntityState.prototype.y = 0;

            /**
             * EntityState dir.
             * @member {number} dir
             * @memberof xunxian.scene.EntityState
             * @instance
             */
            EntityState.prototype.dir = 0;

            /**
             * EntityState action.
             * @member {number} action
             * @memberof xunxian.scene.EntityState
             * @instance
             */
            EntityState.prototype.action = 0;

            /**
             * EntityState name.
             * @member {string} name
             * @memberof xunxian.scene.EntityState
             * @instance
             */
            EntityState.prototype.name = "";

            /**
             * EntityState entityType.
             * @member {number} entityType
             * @memberof xunxian.scene.EntityState
             * @instance
             */
            EntityState.prototype.entityType = 0;

            /**
             * EntityState gender.
             * @member {number} gender
             * @memberof xunxian.scene.EntityState
             * @instance
             */
            EntityState.prototype.gender = 0;

            /**
             * EntityState levelStage.
             * @member {number} levelStage
             * @memberof xunxian.scene.EntityState
             * @instance
             */
            EntityState.prototype.levelStage = 0;

            /**
             * EntityState levelTier.
             * @member {number} levelTier
             * @memberof xunxian.scene.EntityState
             * @instance
             */
            EntityState.prototype.levelTier = 0;

            /**
             * Creates a new EntityState instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.EntityState
             * @static
             * @param {xunxian.scene.IEntityState=} [properties] Properties to set
             * @returns {xunxian.scene.EntityState} EntityState instance
             */
            EntityState.create = function create(properties) {
                return new EntityState(properties);
            };

            /**
             * Encodes the specified EntityState message. Does not implicitly {@link xunxian.scene.EntityState.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.EntityState
             * @static
             * @param {xunxian.scene.IEntityState} message EntityState message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EntityState.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.entityId != null && Object.hasOwnProperty.call(message, "entityId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.entityId);
                if (message.x != null && Object.hasOwnProperty.call(message, "x"))
                    writer.uint32(/* id 2, wireType 5 =*/21).float(message.x);
                if (message.y != null && Object.hasOwnProperty.call(message, "y"))
                    writer.uint32(/* id 3, wireType 5 =*/29).float(message.y);
                if (message.dir != null && Object.hasOwnProperty.call(message, "dir"))
                    writer.uint32(/* id 4, wireType 0 =*/32).int32(message.dir);
                if (message.action != null && Object.hasOwnProperty.call(message, "action"))
                    writer.uint32(/* id 5, wireType 0 =*/40).int32(message.action);
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    writer.uint32(/* id 6, wireType 2 =*/50).string(message.name);
                if (message.entityType != null && Object.hasOwnProperty.call(message, "entityType"))
                    writer.uint32(/* id 7, wireType 0 =*/56).int32(message.entityType);
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    writer.uint32(/* id 8, wireType 0 =*/64).int32(message.gender);
                if (message.levelStage != null && Object.hasOwnProperty.call(message, "levelStage"))
                    writer.uint32(/* id 9, wireType 0 =*/72).int32(message.levelStage);
                if (message.levelTier != null && Object.hasOwnProperty.call(message, "levelTier"))
                    writer.uint32(/* id 10, wireType 0 =*/80).int32(message.levelTier);
                return writer;
            };

            /**
             * Encodes the specified EntityState message, length delimited. Does not implicitly {@link xunxian.scene.EntityState.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.EntityState
             * @static
             * @param {xunxian.scene.IEntityState} message EntityState message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EntityState.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes an EntityState message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.EntityState
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.EntityState} EntityState
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            EntityState.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.EntityState();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.entityId = reader.int64();
                            break;
                        }
                    case 2: {
                            message.x = reader.float();
                            break;
                        }
                    case 3: {
                            message.y = reader.float();
                            break;
                        }
                    case 4: {
                            message.dir = reader.int32();
                            break;
                        }
                    case 5: {
                            message.action = reader.int32();
                            break;
                        }
                    case 6: {
                            message.name = reader.string();
                            break;
                        }
                    case 7: {
                            message.entityType = reader.int32();
                            break;
                        }
                    case 8: {
                            message.gender = reader.int32();
                            break;
                        }
                    case 9: {
                            message.levelStage = reader.int32();
                            break;
                        }
                    case 10: {
                            message.levelTier = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an EntityState message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.EntityState
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.EntityState} EntityState
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            EntityState.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an EntityState message.
             * @function verify
             * @memberof xunxian.scene.EntityState
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            EntityState.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.entityId != null && Object.hasOwnProperty.call(message, "entityId"))
                    if (!$util.isInteger(message.entityId) && !(message.entityId && $util.isInteger(message.entityId.low) && $util.isInteger(message.entityId.high)))
                        return "entityId: integer|Long expected";
                if (message.x != null && Object.hasOwnProperty.call(message, "x"))
                    if (typeof message.x !== "number")
                        return "x: number expected";
                if (message.y != null && Object.hasOwnProperty.call(message, "y"))
                    if (typeof message.y !== "number")
                        return "y: number expected";
                if (message.dir != null && Object.hasOwnProperty.call(message, "dir"))
                    if (!$util.isInteger(message.dir))
                        return "dir: integer expected";
                if (message.action != null && Object.hasOwnProperty.call(message, "action"))
                    if (!$util.isInteger(message.action))
                        return "action: integer expected";
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    if (!$util.isString(message.name))
                        return "name: string expected";
                if (message.entityType != null && Object.hasOwnProperty.call(message, "entityType"))
                    if (!$util.isInteger(message.entityType))
                        return "entityType: integer expected";
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    if (!$util.isInteger(message.gender))
                        return "gender: integer expected";
                if (message.levelStage != null && Object.hasOwnProperty.call(message, "levelStage"))
                    if (!$util.isInteger(message.levelStage))
                        return "levelStage: integer expected";
                if (message.levelTier != null && Object.hasOwnProperty.call(message, "levelTier"))
                    if (!$util.isInteger(message.levelTier))
                        return "levelTier: integer expected";
                return null;
            };

            /**
             * Creates an EntityState message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.EntityState
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.EntityState} EntityState
             */
            EntityState.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.EntityState)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.EntityState: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.EntityState();
                if (object.entityId != null)
                    if ($util.Long)
                        message.entityId = $util.Long.fromValue(object.entityId, false);
                    else if (typeof object.entityId === "string")
                        message.entityId = parseInt(object.entityId, 10);
                    else if (typeof object.entityId === "number")
                        message.entityId = object.entityId;
                    else if (typeof object.entityId === "object")
                        message.entityId = new $util.LongBits(object.entityId.low >>> 0, object.entityId.high >>> 0).toNumber();
                if (object.x != null)
                    message.x = Number(object.x);
                if (object.y != null)
                    message.y = Number(object.y);
                if (object.dir != null)
                    message.dir = object.dir | 0;
                if (object.action != null)
                    message.action = object.action | 0;
                if (object.name != null)
                    message.name = String(object.name);
                if (object.entityType != null)
                    message.entityType = object.entityType | 0;
                if (object.gender != null)
                    message.gender = object.gender | 0;
                if (object.levelStage != null)
                    message.levelStage = object.levelStage | 0;
                if (object.levelTier != null)
                    message.levelTier = object.levelTier | 0;
                return message;
            };

            /**
             * Creates a plain object from an EntityState message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.EntityState
             * @static
             * @param {xunxian.scene.EntityState} message EntityState
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            EntityState.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.entityId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.entityId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                    object.x = 0;
                    object.y = 0;
                    object.dir = 0;
                    object.action = 0;
                    object.name = "";
                    object.entityType = 0;
                    object.gender = 0;
                    object.levelStage = 0;
                    object.levelTier = 0;
                }
                if (message.entityId != null && Object.hasOwnProperty.call(message, "entityId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.entityId = typeof message.entityId === "number" ? BigInt(message.entityId) : $util.Long.fromBits(message.entityId.low >>> 0, message.entityId.high >>> 0, false).toBigInt();
                    else if (typeof message.entityId === "number")
                        object.entityId = options.longs === String ? String(message.entityId) : message.entityId;
                    else
                        object.entityId = options.longs === String ? $util.Long.prototype.toString.call(message.entityId) : options.longs === Number ? new $util.LongBits(message.entityId.low >>> 0, message.entityId.high >>> 0).toNumber() : message.entityId;
                if (message.x != null && Object.hasOwnProperty.call(message, "x"))
                    object.x = options.json && !isFinite(message.x) ? String(message.x) : message.x;
                if (message.y != null && Object.hasOwnProperty.call(message, "y"))
                    object.y = options.json && !isFinite(message.y) ? String(message.y) : message.y;
                if (message.dir != null && Object.hasOwnProperty.call(message, "dir"))
                    object.dir = message.dir;
                if (message.action != null && Object.hasOwnProperty.call(message, "action"))
                    object.action = message.action;
                if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                    object.name = message.name;
                if (message.entityType != null && Object.hasOwnProperty.call(message, "entityType"))
                    object.entityType = message.entityType;
                if (message.gender != null && Object.hasOwnProperty.call(message, "gender"))
                    object.gender = message.gender;
                if (message.levelStage != null && Object.hasOwnProperty.call(message, "levelStage"))
                    object.levelStage = message.levelStage;
                if (message.levelTier != null && Object.hasOwnProperty.call(message, "levelTier"))
                    object.levelTier = message.levelTier;
                return object;
            };

            /**
             * Converts this EntityState to JSON.
             * @function toJSON
             * @memberof xunxian.scene.EntityState
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            EntityState.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for EntityState
             * @function getTypeUrl
             * @memberof xunxian.scene.EntityState
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            EntityState.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.EntityState";
            };

            return EntityState;
        })();

        scene.EnterEvent = (function() {

            /**
             * Properties of an EnterEvent.
             * @memberof xunxian.scene
             * @interface IEnterEvent
             * @property {xunxian.scene.IEntityState|null} [entity] EnterEvent entity
             */

            /**
             * Constructs a new EnterEvent.
             * @memberof xunxian.scene
             * @classdesc Represents an EnterEvent.
             * @implements IEnterEvent
             * @constructor
             * @param {xunxian.scene.IEnterEvent=} [properties] Properties to set
             */
            function EnterEvent(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * EnterEvent entity.
             * @member {xunxian.scene.IEntityState|null|undefined} entity
             * @memberof xunxian.scene.EnterEvent
             * @instance
             */
            EnterEvent.prototype.entity = null;

            /**
             * Creates a new EnterEvent instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.EnterEvent
             * @static
             * @param {xunxian.scene.IEnterEvent=} [properties] Properties to set
             * @returns {xunxian.scene.EnterEvent} EnterEvent instance
             */
            EnterEvent.create = function create(properties) {
                return new EnterEvent(properties);
            };

            /**
             * Encodes the specified EnterEvent message. Does not implicitly {@link xunxian.scene.EnterEvent.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.EnterEvent
             * @static
             * @param {xunxian.scene.IEnterEvent} message EnterEvent message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EnterEvent.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.entity != null && Object.hasOwnProperty.call(message, "entity"))
                    $root.xunxian.scene.EntityState.encode(message.entity, writer.uint32(/* id 1, wireType 2 =*/10).fork(), q + 1).ldelim();
                return writer;
            };

            /**
             * Encodes the specified EnterEvent message, length delimited. Does not implicitly {@link xunxian.scene.EnterEvent.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.EnterEvent
             * @static
             * @param {xunxian.scene.IEnterEvent} message EnterEvent message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EnterEvent.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes an EnterEvent message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.EnterEvent
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.EnterEvent} EnterEvent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            EnterEvent.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.EnterEvent();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.entity = $root.xunxian.scene.EntityState.decode(reader, reader.uint32(), undefined, long + 1);
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an EnterEvent message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.EnterEvent
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.EnterEvent} EnterEvent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            EnterEvent.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an EnterEvent message.
             * @function verify
             * @memberof xunxian.scene.EnterEvent
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            EnterEvent.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.entity != null && Object.hasOwnProperty.call(message, "entity")) {
                    var error = $root.xunxian.scene.EntityState.verify(message.entity, long + 1);
                    if (error)
                        return "entity." + error;
                }
                return null;
            };

            /**
             * Creates an EnterEvent message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.EnterEvent
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.EnterEvent} EnterEvent
             */
            EnterEvent.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.EnterEvent)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.EnterEvent: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.EnterEvent();
                if (object.entity != null) {
                    if (!$util.isObject(object.entity))
                        throw TypeError(".xunxian.scene.EnterEvent.entity: object expected");
                    message.entity = $root.xunxian.scene.EntityState.fromObject(object.entity, long + 1);
                }
                return message;
            };

            /**
             * Creates a plain object from an EnterEvent message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.EnterEvent
             * @static
             * @param {xunxian.scene.EnterEvent} message EnterEvent
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            EnterEvent.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults)
                    object.entity = null;
                if (message.entity != null && Object.hasOwnProperty.call(message, "entity"))
                    object.entity = $root.xunxian.scene.EntityState.toObject(message.entity, options, q + 1);
                return object;
            };

            /**
             * Converts this EnterEvent to JSON.
             * @function toJSON
             * @memberof xunxian.scene.EnterEvent
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            EnterEvent.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for EnterEvent
             * @function getTypeUrl
             * @memberof xunxian.scene.EnterEvent
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            EnterEvent.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.EnterEvent";
            };

            return EnterEvent;
        })();

        scene.LeaveEvent = (function() {

            /**
             * Properties of a LeaveEvent.
             * @memberof xunxian.scene
             * @interface ILeaveEvent
             * @property {number|Long|null} [entityId] LeaveEvent entityId
             */

            /**
             * Constructs a new LeaveEvent.
             * @memberof xunxian.scene
             * @classdesc Represents a LeaveEvent.
             * @implements ILeaveEvent
             * @constructor
             * @param {xunxian.scene.ILeaveEvent=} [properties] Properties to set
             */
            function LeaveEvent(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * LeaveEvent entityId.
             * @member {number|Long} entityId
             * @memberof xunxian.scene.LeaveEvent
             * @instance
             */
            LeaveEvent.prototype.entityId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Creates a new LeaveEvent instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.LeaveEvent
             * @static
             * @param {xunxian.scene.ILeaveEvent=} [properties] Properties to set
             * @returns {xunxian.scene.LeaveEvent} LeaveEvent instance
             */
            LeaveEvent.create = function create(properties) {
                return new LeaveEvent(properties);
            };

            /**
             * Encodes the specified LeaveEvent message. Does not implicitly {@link xunxian.scene.LeaveEvent.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.LeaveEvent
             * @static
             * @param {xunxian.scene.ILeaveEvent} message LeaveEvent message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            LeaveEvent.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.entityId != null && Object.hasOwnProperty.call(message, "entityId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.entityId);
                return writer;
            };

            /**
             * Encodes the specified LeaveEvent message, length delimited. Does not implicitly {@link xunxian.scene.LeaveEvent.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.LeaveEvent
             * @static
             * @param {xunxian.scene.ILeaveEvent} message LeaveEvent message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            LeaveEvent.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a LeaveEvent message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.LeaveEvent
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.LeaveEvent} LeaveEvent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            LeaveEvent.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.LeaveEvent();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.entityId = reader.int64();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a LeaveEvent message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.LeaveEvent
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.LeaveEvent} LeaveEvent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            LeaveEvent.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a LeaveEvent message.
             * @function verify
             * @memberof xunxian.scene.LeaveEvent
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            LeaveEvent.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.entityId != null && Object.hasOwnProperty.call(message, "entityId"))
                    if (!$util.isInteger(message.entityId) && !(message.entityId && $util.isInteger(message.entityId.low) && $util.isInteger(message.entityId.high)))
                        return "entityId: integer|Long expected";
                return null;
            };

            /**
             * Creates a LeaveEvent message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.LeaveEvent
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.LeaveEvent} LeaveEvent
             */
            LeaveEvent.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.LeaveEvent)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.LeaveEvent: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.LeaveEvent();
                if (object.entityId != null)
                    if ($util.Long)
                        message.entityId = $util.Long.fromValue(object.entityId, false);
                    else if (typeof object.entityId === "string")
                        message.entityId = parseInt(object.entityId, 10);
                    else if (typeof object.entityId === "number")
                        message.entityId = object.entityId;
                    else if (typeof object.entityId === "object")
                        message.entityId = new $util.LongBits(object.entityId.low >>> 0, object.entityId.high >>> 0).toNumber();
                return message;
            };

            /**
             * Creates a plain object from a LeaveEvent message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.LeaveEvent
             * @static
             * @param {xunxian.scene.LeaveEvent} message LeaveEvent
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            LeaveEvent.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults)
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.entityId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.entityId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                if (message.entityId != null && Object.hasOwnProperty.call(message, "entityId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.entityId = typeof message.entityId === "number" ? BigInt(message.entityId) : $util.Long.fromBits(message.entityId.low >>> 0, message.entityId.high >>> 0, false).toBigInt();
                    else if (typeof message.entityId === "number")
                        object.entityId = options.longs === String ? String(message.entityId) : message.entityId;
                    else
                        object.entityId = options.longs === String ? $util.Long.prototype.toString.call(message.entityId) : options.longs === Number ? new $util.LongBits(message.entityId.low >>> 0, message.entityId.high >>> 0).toNumber() : message.entityId;
                return object;
            };

            /**
             * Converts this LeaveEvent to JSON.
             * @function toJSON
             * @memberof xunxian.scene.LeaveEvent
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            LeaveEvent.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for LeaveEvent
             * @function getTypeUrl
             * @memberof xunxian.scene.LeaveEvent
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            LeaveEvent.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.LeaveEvent";
            };

            return LeaveEvent;
        })();

        scene.InteractRequest = (function() {

            /**
             * Properties of an InteractRequest.
             * @memberof xunxian.scene
             * @interface IInteractRequest
             * @property {number|Long|null} [playerId] InteractRequest playerId
             * @property {number|null} [npcId] InteractRequest npcId
             * @property {string|null} [action] InteractRequest action
             */

            /**
             * Constructs a new InteractRequest.
             * @memberof xunxian.scene
             * @classdesc Represents an InteractRequest.
             * @implements IInteractRequest
             * @constructor
             * @param {xunxian.scene.IInteractRequest=} [properties] Properties to set
             */
            function InteractRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * InteractRequest playerId.
             * @member {number|Long} playerId
             * @memberof xunxian.scene.InteractRequest
             * @instance
             */
            InteractRequest.prototype.playerId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * InteractRequest npcId.
             * @member {number} npcId
             * @memberof xunxian.scene.InteractRequest
             * @instance
             */
            InteractRequest.prototype.npcId = 0;

            /**
             * InteractRequest action.
             * @member {string} action
             * @memberof xunxian.scene.InteractRequest
             * @instance
             */
            InteractRequest.prototype.action = "";

            /**
             * Creates a new InteractRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.InteractRequest
             * @static
             * @param {xunxian.scene.IInteractRequest=} [properties] Properties to set
             * @returns {xunxian.scene.InteractRequest} InteractRequest instance
             */
            InteractRequest.create = function create(properties) {
                return new InteractRequest(properties);
            };

            /**
             * Encodes the specified InteractRequest message. Does not implicitly {@link xunxian.scene.InteractRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.InteractRequest
             * @static
             * @param {xunxian.scene.IInteractRequest} message InteractRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            InteractRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.playerId);
                if (message.npcId != null && Object.hasOwnProperty.call(message, "npcId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.npcId);
                if (message.action != null && Object.hasOwnProperty.call(message, "action"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.action);
                return writer;
            };

            /**
             * Encodes the specified InteractRequest message, length delimited. Does not implicitly {@link xunxian.scene.InteractRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.InteractRequest
             * @static
             * @param {xunxian.scene.IInteractRequest} message InteractRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            InteractRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes an InteractRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.InteractRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.InteractRequest} InteractRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            InteractRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.InteractRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.playerId = reader.int64();
                            break;
                        }
                    case 2: {
                            message.npcId = reader.int32();
                            break;
                        }
                    case 3: {
                            message.action = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an InteractRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.InteractRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.InteractRequest} InteractRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            InteractRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an InteractRequest message.
             * @function verify
             * @memberof xunxian.scene.InteractRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            InteractRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (!$util.isInteger(message.playerId) && !(message.playerId && $util.isInteger(message.playerId.low) && $util.isInteger(message.playerId.high)))
                        return "playerId: integer|Long expected";
                if (message.npcId != null && Object.hasOwnProperty.call(message, "npcId"))
                    if (!$util.isInteger(message.npcId))
                        return "npcId: integer expected";
                if (message.action != null && Object.hasOwnProperty.call(message, "action"))
                    if (!$util.isString(message.action))
                        return "action: string expected";
                return null;
            };

            /**
             * Creates an InteractRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.InteractRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.InteractRequest} InteractRequest
             */
            InteractRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.InteractRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.InteractRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.InteractRequest();
                if (object.playerId != null)
                    if ($util.Long)
                        message.playerId = $util.Long.fromValue(object.playerId, false);
                    else if (typeof object.playerId === "string")
                        message.playerId = parseInt(object.playerId, 10);
                    else if (typeof object.playerId === "number")
                        message.playerId = object.playerId;
                    else if (typeof object.playerId === "object")
                        message.playerId = new $util.LongBits(object.playerId.low >>> 0, object.playerId.high >>> 0).toNumber();
                if (object.npcId != null)
                    message.npcId = object.npcId | 0;
                if (object.action != null)
                    message.action = String(object.action);
                return message;
            };

            /**
             * Creates a plain object from an InteractRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.InteractRequest
             * @static
             * @param {xunxian.scene.InteractRequest} message InteractRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            InteractRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.playerId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.playerId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                    object.npcId = 0;
                    object.action = "";
                }
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.playerId = typeof message.playerId === "number" ? BigInt(message.playerId) : $util.Long.fromBits(message.playerId.low >>> 0, message.playerId.high >>> 0, false).toBigInt();
                    else if (typeof message.playerId === "number")
                        object.playerId = options.longs === String ? String(message.playerId) : message.playerId;
                    else
                        object.playerId = options.longs === String ? $util.Long.prototype.toString.call(message.playerId) : options.longs === Number ? new $util.LongBits(message.playerId.low >>> 0, message.playerId.high >>> 0).toNumber() : message.playerId;
                if (message.npcId != null && Object.hasOwnProperty.call(message, "npcId"))
                    object.npcId = message.npcId;
                if (message.action != null && Object.hasOwnProperty.call(message, "action"))
                    object.action = message.action;
                return object;
            };

            /**
             * Converts this InteractRequest to JSON.
             * @function toJSON
             * @memberof xunxian.scene.InteractRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            InteractRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for InteractRequest
             * @function getTypeUrl
             * @memberof xunxian.scene.InteractRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            InteractRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.InteractRequest";
            };

            return InteractRequest;
        })();

        scene.InteractResponse = (function() {

            /**
             * Properties of an InteractResponse.
             * @memberof xunxian.scene
             * @interface IInteractResponse
             * @property {number|null} [code] InteractResponse code
             * @property {string|null} [msg] InteractResponse msg
             * @property {string|null} [type] InteractResponse type
             * @property {string|null} [data] InteractResponse data
             */

            /**
             * Constructs a new InteractResponse.
             * @memberof xunxian.scene
             * @classdesc Represents an InteractResponse.
             * @implements IInteractResponse
             * @constructor
             * @param {xunxian.scene.IInteractResponse=} [properties] Properties to set
             */
            function InteractResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * InteractResponse code.
             * @member {number} code
             * @memberof xunxian.scene.InteractResponse
             * @instance
             */
            InteractResponse.prototype.code = 0;

            /**
             * InteractResponse msg.
             * @member {string} msg
             * @memberof xunxian.scene.InteractResponse
             * @instance
             */
            InteractResponse.prototype.msg = "";

            /**
             * InteractResponse type.
             * @member {string} type
             * @memberof xunxian.scene.InteractResponse
             * @instance
             */
            InteractResponse.prototype.type = "";

            /**
             * InteractResponse data.
             * @member {string} data
             * @memberof xunxian.scene.InteractResponse
             * @instance
             */
            InteractResponse.prototype.data = "";

            /**
             * Creates a new InteractResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.InteractResponse
             * @static
             * @param {xunxian.scene.IInteractResponse=} [properties] Properties to set
             * @returns {xunxian.scene.InteractResponse} InteractResponse instance
             */
            InteractResponse.create = function create(properties) {
                return new InteractResponse(properties);
            };

            /**
             * Encodes the specified InteractResponse message. Does not implicitly {@link xunxian.scene.InteractResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.InteractResponse
             * @static
             * @param {xunxian.scene.IInteractResponse} message InteractResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            InteractResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.type);
                if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.data);
                return writer;
            };

            /**
             * Encodes the specified InteractResponse message, length delimited. Does not implicitly {@link xunxian.scene.InteractResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.InteractResponse
             * @static
             * @param {xunxian.scene.IInteractResponse} message InteractResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            InteractResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes an InteractResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.InteractResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.InteractResponse} InteractResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            InteractResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.InteractResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            message.type = reader.string();
                            break;
                        }
                    case 4: {
                            message.data = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes an InteractResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.InteractResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.InteractResponse} InteractResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            InteractResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies an InteractResponse message.
             * @function verify
             * @memberof xunxian.scene.InteractResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            InteractResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                    if (!$util.isString(message.type))
                        return "type: string expected";
                if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                    if (!$util.isString(message.data))
                        return "data: string expected";
                return null;
            };

            /**
             * Creates an InteractResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.InteractResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.InteractResponse} InteractResponse
             */
            InteractResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.InteractResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.InteractResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.InteractResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.type != null)
                    message.type = String(object.type);
                if (object.data != null)
                    message.data = String(object.data);
                return message;
            };

            /**
             * Creates a plain object from an InteractResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.InteractResponse
             * @static
             * @param {xunxian.scene.InteractResponse} message InteractResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            InteractResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.type = "";
                    object.data = "";
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                    object.type = message.type;
                if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                    object.data = message.data;
                return object;
            };

            /**
             * Converts this InteractResponse to JSON.
             * @function toJSON
             * @memberof xunxian.scene.InteractResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            InteractResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for InteractResponse
             * @function getTypeUrl
             * @memberof xunxian.scene.InteractResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            InteractResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.InteractResponse";
            };

            return InteractResponse;
        })();

        scene.ChatMessage = (function() {

            /**
             * Properties of a ChatMessage.
             * @memberof xunxian.scene
             * @interface IChatMessage
             * @property {number|Long|null} [senderId] ChatMessage senderId
             * @property {string|null} [senderName] ChatMessage senderName
             * @property {number|null} [channel] ChatMessage channel
             * @property {string|null} [text] ChatMessage text
             * @property {number|Long|null} [timestamp] ChatMessage timestamp
             */

            /**
             * Constructs a new ChatMessage.
             * @memberof xunxian.scene
             * @classdesc Represents a ChatMessage.
             * @implements IChatMessage
             * @constructor
             * @param {xunxian.scene.IChatMessage=} [properties] Properties to set
             */
            function ChatMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ChatMessage senderId.
             * @member {number|Long} senderId
             * @memberof xunxian.scene.ChatMessage
             * @instance
             */
            ChatMessage.prototype.senderId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * ChatMessage senderName.
             * @member {string} senderName
             * @memberof xunxian.scene.ChatMessage
             * @instance
             */
            ChatMessage.prototype.senderName = "";

            /**
             * ChatMessage channel.
             * @member {number} channel
             * @memberof xunxian.scene.ChatMessage
             * @instance
             */
            ChatMessage.prototype.channel = 0;

            /**
             * ChatMessage text.
             * @member {string} text
             * @memberof xunxian.scene.ChatMessage
             * @instance
             */
            ChatMessage.prototype.text = "";

            /**
             * ChatMessage timestamp.
             * @member {number|Long} timestamp
             * @memberof xunxian.scene.ChatMessage
             * @instance
             */
            ChatMessage.prototype.timestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Creates a new ChatMessage instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.ChatMessage
             * @static
             * @param {xunxian.scene.IChatMessage=} [properties] Properties to set
             * @returns {xunxian.scene.ChatMessage} ChatMessage instance
             */
            ChatMessage.create = function create(properties) {
                return new ChatMessage(properties);
            };

            /**
             * Encodes the specified ChatMessage message. Does not implicitly {@link xunxian.scene.ChatMessage.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.ChatMessage
             * @static
             * @param {xunxian.scene.IChatMessage} message ChatMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ChatMessage.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.senderId != null && Object.hasOwnProperty.call(message, "senderId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.senderId);
                if (message.senderName != null && Object.hasOwnProperty.call(message, "senderName"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.senderName);
                if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                    writer.uint32(/* id 3, wireType 0 =*/24).int32(message.channel);
                if (message.text != null && Object.hasOwnProperty.call(message, "text"))
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.text);
                if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                    writer.uint32(/* id 5, wireType 0 =*/40).int64(message.timestamp);
                return writer;
            };

            /**
             * Encodes the specified ChatMessage message, length delimited. Does not implicitly {@link xunxian.scene.ChatMessage.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.ChatMessage
             * @static
             * @param {xunxian.scene.IChatMessage} message ChatMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ChatMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a ChatMessage message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.ChatMessage
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.ChatMessage} ChatMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ChatMessage.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.ChatMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.senderId = reader.int64();
                            break;
                        }
                    case 2: {
                            message.senderName = reader.string();
                            break;
                        }
                    case 3: {
                            message.channel = reader.int32();
                            break;
                        }
                    case 4: {
                            message.text = reader.string();
                            break;
                        }
                    case 5: {
                            message.timestamp = reader.int64();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ChatMessage message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.ChatMessage
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.ChatMessage} ChatMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ChatMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ChatMessage message.
             * @function verify
             * @memberof xunxian.scene.ChatMessage
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ChatMessage.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.senderId != null && Object.hasOwnProperty.call(message, "senderId"))
                    if (!$util.isInteger(message.senderId) && !(message.senderId && $util.isInteger(message.senderId.low) && $util.isInteger(message.senderId.high)))
                        return "senderId: integer|Long expected";
                if (message.senderName != null && Object.hasOwnProperty.call(message, "senderName"))
                    if (!$util.isString(message.senderName))
                        return "senderName: string expected";
                if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                    if (!$util.isInteger(message.channel))
                        return "channel: integer expected";
                if (message.text != null && Object.hasOwnProperty.call(message, "text"))
                    if (!$util.isString(message.text))
                        return "text: string expected";
                if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                    if (!$util.isInteger(message.timestamp) && !(message.timestamp && $util.isInteger(message.timestamp.low) && $util.isInteger(message.timestamp.high)))
                        return "timestamp: integer|Long expected";
                return null;
            };

            /**
             * Creates a ChatMessage message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.ChatMessage
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.ChatMessage} ChatMessage
             */
            ChatMessage.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.ChatMessage)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.ChatMessage: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.ChatMessage();
                if (object.senderId != null)
                    if ($util.Long)
                        message.senderId = $util.Long.fromValue(object.senderId, false);
                    else if (typeof object.senderId === "string")
                        message.senderId = parseInt(object.senderId, 10);
                    else if (typeof object.senderId === "number")
                        message.senderId = object.senderId;
                    else if (typeof object.senderId === "object")
                        message.senderId = new $util.LongBits(object.senderId.low >>> 0, object.senderId.high >>> 0).toNumber();
                if (object.senderName != null)
                    message.senderName = String(object.senderName);
                if (object.channel != null)
                    message.channel = object.channel | 0;
                if (object.text != null)
                    message.text = String(object.text);
                if (object.timestamp != null)
                    if ($util.Long)
                        message.timestamp = $util.Long.fromValue(object.timestamp, false);
                    else if (typeof object.timestamp === "string")
                        message.timestamp = parseInt(object.timestamp, 10);
                    else if (typeof object.timestamp === "number")
                        message.timestamp = object.timestamp;
                    else if (typeof object.timestamp === "object")
                        message.timestamp = new $util.LongBits(object.timestamp.low >>> 0, object.timestamp.high >>> 0).toNumber();
                return message;
            };

            /**
             * Creates a plain object from a ChatMessage message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.ChatMessage
             * @static
             * @param {xunxian.scene.ChatMessage} message ChatMessage
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ChatMessage.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.senderId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.senderId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                    object.senderName = "";
                    object.channel = 0;
                    object.text = "";
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.timestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.timestamp = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                }
                if (message.senderId != null && Object.hasOwnProperty.call(message, "senderId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.senderId = typeof message.senderId === "number" ? BigInt(message.senderId) : $util.Long.fromBits(message.senderId.low >>> 0, message.senderId.high >>> 0, false).toBigInt();
                    else if (typeof message.senderId === "number")
                        object.senderId = options.longs === String ? String(message.senderId) : message.senderId;
                    else
                        object.senderId = options.longs === String ? $util.Long.prototype.toString.call(message.senderId) : options.longs === Number ? new $util.LongBits(message.senderId.low >>> 0, message.senderId.high >>> 0).toNumber() : message.senderId;
                if (message.senderName != null && Object.hasOwnProperty.call(message, "senderName"))
                    object.senderName = message.senderName;
                if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                    object.channel = message.channel;
                if (message.text != null && Object.hasOwnProperty.call(message, "text"))
                    object.text = message.text;
                if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.timestamp = typeof message.timestamp === "number" ? BigInt(message.timestamp) : $util.Long.fromBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0, false).toBigInt();
                    else if (typeof message.timestamp === "number")
                        object.timestamp = options.longs === String ? String(message.timestamp) : message.timestamp;
                    else
                        object.timestamp = options.longs === String ? $util.Long.prototype.toString.call(message.timestamp) : options.longs === Number ? new $util.LongBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0).toNumber() : message.timestamp;
                return object;
            };

            /**
             * Converts this ChatMessage to JSON.
             * @function toJSON
             * @memberof xunxian.scene.ChatMessage
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ChatMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ChatMessage
             * @function getTypeUrl
             * @memberof xunxian.scene.ChatMessage
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ChatMessage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.ChatMessage";
            };

            return ChatMessage;
        })();

        scene.SendChatRequest = (function() {

            /**
             * Properties of a SendChatRequest.
             * @memberof xunxian.scene
             * @interface ISendChatRequest
             * @property {number|null} [channel] SendChatRequest channel
             * @property {string|null} [text] SendChatRequest text
             * @property {number|Long|null} [targetId] SendChatRequest targetId
             */

            /**
             * Constructs a new SendChatRequest.
             * @memberof xunxian.scene
             * @classdesc Represents a SendChatRequest.
             * @implements ISendChatRequest
             * @constructor
             * @param {xunxian.scene.ISendChatRequest=} [properties] Properties to set
             */
            function SendChatRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * SendChatRequest channel.
             * @member {number} channel
             * @memberof xunxian.scene.SendChatRequest
             * @instance
             */
            SendChatRequest.prototype.channel = 0;

            /**
             * SendChatRequest text.
             * @member {string} text
             * @memberof xunxian.scene.SendChatRequest
             * @instance
             */
            SendChatRequest.prototype.text = "";

            /**
             * SendChatRequest targetId.
             * @member {number|Long} targetId
             * @memberof xunxian.scene.SendChatRequest
             * @instance
             */
            SendChatRequest.prototype.targetId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Creates a new SendChatRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.SendChatRequest
             * @static
             * @param {xunxian.scene.ISendChatRequest=} [properties] Properties to set
             * @returns {xunxian.scene.SendChatRequest} SendChatRequest instance
             */
            SendChatRequest.create = function create(properties) {
                return new SendChatRequest(properties);
            };

            /**
             * Encodes the specified SendChatRequest message. Does not implicitly {@link xunxian.scene.SendChatRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.SendChatRequest
             * @static
             * @param {xunxian.scene.ISendChatRequest} message SendChatRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SendChatRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.channel);
                if (message.text != null && Object.hasOwnProperty.call(message, "text"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.text);
                if (message.targetId != null && Object.hasOwnProperty.call(message, "targetId"))
                    writer.uint32(/* id 3, wireType 0 =*/24).int64(message.targetId);
                return writer;
            };

            /**
             * Encodes the specified SendChatRequest message, length delimited. Does not implicitly {@link xunxian.scene.SendChatRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.SendChatRequest
             * @static
             * @param {xunxian.scene.ISendChatRequest} message SendChatRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SendChatRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a SendChatRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.SendChatRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.SendChatRequest} SendChatRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SendChatRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.SendChatRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.channel = reader.int32();
                            break;
                        }
                    case 2: {
                            message.text = reader.string();
                            break;
                        }
                    case 3: {
                            message.targetId = reader.int64();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a SendChatRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.SendChatRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.SendChatRequest} SendChatRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SendChatRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SendChatRequest message.
             * @function verify
             * @memberof xunxian.scene.SendChatRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SendChatRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                    if (!$util.isInteger(message.channel))
                        return "channel: integer expected";
                if (message.text != null && Object.hasOwnProperty.call(message, "text"))
                    if (!$util.isString(message.text))
                        return "text: string expected";
                if (message.targetId != null && Object.hasOwnProperty.call(message, "targetId"))
                    if (!$util.isInteger(message.targetId) && !(message.targetId && $util.isInteger(message.targetId.low) && $util.isInteger(message.targetId.high)))
                        return "targetId: integer|Long expected";
                return null;
            };

            /**
             * Creates a SendChatRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.SendChatRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.SendChatRequest} SendChatRequest
             */
            SendChatRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.SendChatRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.SendChatRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.SendChatRequest();
                if (object.channel != null)
                    message.channel = object.channel | 0;
                if (object.text != null)
                    message.text = String(object.text);
                if (object.targetId != null)
                    if ($util.Long)
                        message.targetId = $util.Long.fromValue(object.targetId, false);
                    else if (typeof object.targetId === "string")
                        message.targetId = parseInt(object.targetId, 10);
                    else if (typeof object.targetId === "number")
                        message.targetId = object.targetId;
                    else if (typeof object.targetId === "object")
                        message.targetId = new $util.LongBits(object.targetId.low >>> 0, object.targetId.high >>> 0).toNumber();
                return message;
            };

            /**
             * Creates a plain object from a SendChatRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.SendChatRequest
             * @static
             * @param {xunxian.scene.SendChatRequest} message SendChatRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SendChatRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.channel = 0;
                    object.text = "";
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.targetId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.targetId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                }
                if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                    object.channel = message.channel;
                if (message.text != null && Object.hasOwnProperty.call(message, "text"))
                    object.text = message.text;
                if (message.targetId != null && Object.hasOwnProperty.call(message, "targetId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.targetId = typeof message.targetId === "number" ? BigInt(message.targetId) : $util.Long.fromBits(message.targetId.low >>> 0, message.targetId.high >>> 0, false).toBigInt();
                    else if (typeof message.targetId === "number")
                        object.targetId = options.longs === String ? String(message.targetId) : message.targetId;
                    else
                        object.targetId = options.longs === String ? $util.Long.prototype.toString.call(message.targetId) : options.longs === Number ? new $util.LongBits(message.targetId.low >>> 0, message.targetId.high >>> 0).toNumber() : message.targetId;
                return object;
            };

            /**
             * Converts this SendChatRequest to JSON.
             * @function toJSON
             * @memberof xunxian.scene.SendChatRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SendChatRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SendChatRequest
             * @function getTypeUrl
             * @memberof xunxian.scene.SendChatRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SendChatRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.SendChatRequest";
            };

            return SendChatRequest;
        })();

        scene.SendChatResponse = (function() {

            /**
             * Properties of a SendChatResponse.
             * @memberof xunxian.scene
             * @interface ISendChatResponse
             * @property {number|null} [code] SendChatResponse code
             * @property {string|null} [msg] SendChatResponse msg
             */

            /**
             * Constructs a new SendChatResponse.
             * @memberof xunxian.scene
             * @classdesc Represents a SendChatResponse.
             * @implements ISendChatResponse
             * @constructor
             * @param {xunxian.scene.ISendChatResponse=} [properties] Properties to set
             */
            function SendChatResponse(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * SendChatResponse code.
             * @member {number} code
             * @memberof xunxian.scene.SendChatResponse
             * @instance
             */
            SendChatResponse.prototype.code = 0;

            /**
             * SendChatResponse msg.
             * @member {string} msg
             * @memberof xunxian.scene.SendChatResponse
             * @instance
             */
            SendChatResponse.prototype.msg = "";

            /**
             * Creates a new SendChatResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.SendChatResponse
             * @static
             * @param {xunxian.scene.ISendChatResponse=} [properties] Properties to set
             * @returns {xunxian.scene.SendChatResponse} SendChatResponse instance
             */
            SendChatResponse.create = function create(properties) {
                return new SendChatResponse(properties);
            };

            /**
             * Encodes the specified SendChatResponse message. Does not implicitly {@link xunxian.scene.SendChatResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.SendChatResponse
             * @static
             * @param {xunxian.scene.ISendChatResponse} message SendChatResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SendChatResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                return writer;
            };

            /**
             * Encodes the specified SendChatResponse message, length delimited. Does not implicitly {@link xunxian.scene.SendChatResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.SendChatResponse
             * @static
             * @param {xunxian.scene.ISendChatResponse} message SendChatResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            SendChatResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a SendChatResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.SendChatResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.SendChatResponse} SendChatResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SendChatResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.SendChatResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a SendChatResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.SendChatResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.SendChatResponse} SendChatResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            SendChatResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a SendChatResponse message.
             * @function verify
             * @memberof xunxian.scene.SendChatResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            SendChatResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                return null;
            };

            /**
             * Creates a SendChatResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.SendChatResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.SendChatResponse} SendChatResponse
             */
            SendChatResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.SendChatResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.SendChatResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.SendChatResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                return message;
            };

            /**
             * Creates a plain object from a SendChatResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.SendChatResponse
             * @static
             * @param {xunxian.scene.SendChatResponse} message SendChatResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            SendChatResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                return object;
            };

            /**
             * Converts this SendChatResponse to JSON.
             * @function toJSON
             * @memberof xunxian.scene.SendChatResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            SendChatResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for SendChatResponse
             * @function getTypeUrl
             * @memberof xunxian.scene.SendChatResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            SendChatResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.SendChatResponse";
            };

            return SendChatResponse;
        })();

        scene.Heartbeat = (function() {

            /**
             * Properties of a Heartbeat.
             * @memberof xunxian.scene
             * @interface IHeartbeat
             * @property {number|Long|null} [timestamp] Heartbeat timestamp
             */

            /**
             * Constructs a new Heartbeat.
             * @memberof xunxian.scene
             * @classdesc Represents a Heartbeat.
             * @implements IHeartbeat
             * @constructor
             * @param {xunxian.scene.IHeartbeat=} [properties] Properties to set
             */
            function Heartbeat(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Heartbeat timestamp.
             * @member {number|Long} timestamp
             * @memberof xunxian.scene.Heartbeat
             * @instance
             */
            Heartbeat.prototype.timestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Creates a new Heartbeat instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.Heartbeat
             * @static
             * @param {xunxian.scene.IHeartbeat=} [properties] Properties to set
             * @returns {xunxian.scene.Heartbeat} Heartbeat instance
             */
            Heartbeat.create = function create(properties) {
                return new Heartbeat(properties);
            };

            /**
             * Encodes the specified Heartbeat message. Does not implicitly {@link xunxian.scene.Heartbeat.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.Heartbeat
             * @static
             * @param {xunxian.scene.IHeartbeat} message Heartbeat message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Heartbeat.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.timestamp);
                return writer;
            };

            /**
             * Encodes the specified Heartbeat message, length delimited. Does not implicitly {@link xunxian.scene.Heartbeat.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.Heartbeat
             * @static
             * @param {xunxian.scene.IHeartbeat} message Heartbeat message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Heartbeat.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a Heartbeat message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.Heartbeat
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.Heartbeat} Heartbeat
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Heartbeat.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.Heartbeat();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.timestamp = reader.int64();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Heartbeat message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.Heartbeat
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.Heartbeat} Heartbeat
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Heartbeat.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Heartbeat message.
             * @function verify
             * @memberof xunxian.scene.Heartbeat
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Heartbeat.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                    if (!$util.isInteger(message.timestamp) && !(message.timestamp && $util.isInteger(message.timestamp.low) && $util.isInteger(message.timestamp.high)))
                        return "timestamp: integer|Long expected";
                return null;
            };

            /**
             * Creates a Heartbeat message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.Heartbeat
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.Heartbeat} Heartbeat
             */
            Heartbeat.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.Heartbeat)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.Heartbeat: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.Heartbeat();
                if (object.timestamp != null)
                    if ($util.Long)
                        message.timestamp = $util.Long.fromValue(object.timestamp, false);
                    else if (typeof object.timestamp === "string")
                        message.timestamp = parseInt(object.timestamp, 10);
                    else if (typeof object.timestamp === "number")
                        message.timestamp = object.timestamp;
                    else if (typeof object.timestamp === "object")
                        message.timestamp = new $util.LongBits(object.timestamp.low >>> 0, object.timestamp.high >>> 0).toNumber();
                return message;
            };

            /**
             * Creates a plain object from a Heartbeat message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.Heartbeat
             * @static
             * @param {xunxian.scene.Heartbeat} message Heartbeat
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Heartbeat.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults)
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.timestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.timestamp = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.timestamp = typeof message.timestamp === "number" ? BigInt(message.timestamp) : $util.Long.fromBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0, false).toBigInt();
                    else if (typeof message.timestamp === "number")
                        object.timestamp = options.longs === String ? String(message.timestamp) : message.timestamp;
                    else
                        object.timestamp = options.longs === String ? $util.Long.prototype.toString.call(message.timestamp) : options.longs === Number ? new $util.LongBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0).toNumber() : message.timestamp;
                return object;
            };

            /**
             * Converts this Heartbeat to JSON.
             * @function toJSON
             * @memberof xunxian.scene.Heartbeat
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Heartbeat.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Heartbeat
             * @function getTypeUrl
             * @memberof xunxian.scene.Heartbeat
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Heartbeat.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.Heartbeat";
            };

            return Heartbeat;
        })();

        scene.HeartbeatAck = (function() {

            /**
             * Properties of a HeartbeatAck.
             * @memberof xunxian.scene
             * @interface IHeartbeatAck
             * @property {number|Long|null} [serverTime] HeartbeatAck serverTime
             */

            /**
             * Constructs a new HeartbeatAck.
             * @memberof xunxian.scene
             * @classdesc Represents a HeartbeatAck.
             * @implements IHeartbeatAck
             * @constructor
             * @param {xunxian.scene.IHeartbeatAck=} [properties] Properties to set
             */
            function HeartbeatAck(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * HeartbeatAck serverTime.
             * @member {number|Long} serverTime
             * @memberof xunxian.scene.HeartbeatAck
             * @instance
             */
            HeartbeatAck.prototype.serverTime = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Creates a new HeartbeatAck instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.HeartbeatAck
             * @static
             * @param {xunxian.scene.IHeartbeatAck=} [properties] Properties to set
             * @returns {xunxian.scene.HeartbeatAck} HeartbeatAck instance
             */
            HeartbeatAck.create = function create(properties) {
                return new HeartbeatAck(properties);
            };

            /**
             * Encodes the specified HeartbeatAck message. Does not implicitly {@link xunxian.scene.HeartbeatAck.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.HeartbeatAck
             * @static
             * @param {xunxian.scene.IHeartbeatAck} message HeartbeatAck message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            HeartbeatAck.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.serverTime != null && Object.hasOwnProperty.call(message, "serverTime"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.serverTime);
                return writer;
            };

            /**
             * Encodes the specified HeartbeatAck message, length delimited. Does not implicitly {@link xunxian.scene.HeartbeatAck.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.HeartbeatAck
             * @static
             * @param {xunxian.scene.IHeartbeatAck} message HeartbeatAck message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            HeartbeatAck.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a HeartbeatAck message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.HeartbeatAck
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.HeartbeatAck} HeartbeatAck
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            HeartbeatAck.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.HeartbeatAck();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.serverTime = reader.int64();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a HeartbeatAck message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.HeartbeatAck
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.HeartbeatAck} HeartbeatAck
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            HeartbeatAck.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a HeartbeatAck message.
             * @function verify
             * @memberof xunxian.scene.HeartbeatAck
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            HeartbeatAck.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.serverTime != null && Object.hasOwnProperty.call(message, "serverTime"))
                    if (!$util.isInteger(message.serverTime) && !(message.serverTime && $util.isInteger(message.serverTime.low) && $util.isInteger(message.serverTime.high)))
                        return "serverTime: integer|Long expected";
                return null;
            };

            /**
             * Creates a HeartbeatAck message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.HeartbeatAck
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.HeartbeatAck} HeartbeatAck
             */
            HeartbeatAck.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.HeartbeatAck)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.HeartbeatAck: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.HeartbeatAck();
                if (object.serverTime != null)
                    if ($util.Long)
                        message.serverTime = $util.Long.fromValue(object.serverTime, false);
                    else if (typeof object.serverTime === "string")
                        message.serverTime = parseInt(object.serverTime, 10);
                    else if (typeof object.serverTime === "number")
                        message.serverTime = object.serverTime;
                    else if (typeof object.serverTime === "object")
                        message.serverTime = new $util.LongBits(object.serverTime.low >>> 0, object.serverTime.high >>> 0).toNumber();
                return message;
            };

            /**
             * Creates a plain object from a HeartbeatAck message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.HeartbeatAck
             * @static
             * @param {xunxian.scene.HeartbeatAck} message HeartbeatAck
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            HeartbeatAck.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults)
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.serverTime = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.serverTime = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                if (message.serverTime != null && Object.hasOwnProperty.call(message, "serverTime"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.serverTime = typeof message.serverTime === "number" ? BigInt(message.serverTime) : $util.Long.fromBits(message.serverTime.low >>> 0, message.serverTime.high >>> 0, false).toBigInt();
                    else if (typeof message.serverTime === "number")
                        object.serverTime = options.longs === String ? String(message.serverTime) : message.serverTime;
                    else
                        object.serverTime = options.longs === String ? $util.Long.prototype.toString.call(message.serverTime) : options.longs === Number ? new $util.LongBits(message.serverTime.low >>> 0, message.serverTime.high >>> 0).toNumber() : message.serverTime;
                return object;
            };

            /**
             * Converts this HeartbeatAck to JSON.
             * @function toJSON
             * @memberof xunxian.scene.HeartbeatAck
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            HeartbeatAck.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for HeartbeatAck
             * @function getTypeUrl
             * @memberof xunxian.scene.HeartbeatAck
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            HeartbeatAck.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.HeartbeatAck";
            };

            return HeartbeatAck;
        })();

        scene.KickOutEvent = (function() {

            /**
             * Properties of a KickOutEvent.
             * @memberof xunxian.scene
             * @interface IKickOutEvent
             * @property {string|null} [reason] KickOutEvent reason
             */

            /**
             * Constructs a new KickOutEvent.
             * @memberof xunxian.scene
             * @classdesc Represents a KickOutEvent.
             * @implements IKickOutEvent
             * @constructor
             * @param {xunxian.scene.IKickOutEvent=} [properties] Properties to set
             */
            function KickOutEvent(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * KickOutEvent reason.
             * @member {string} reason
             * @memberof xunxian.scene.KickOutEvent
             * @instance
             */
            KickOutEvent.prototype.reason = "";

            /**
             * Creates a new KickOutEvent instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.KickOutEvent
             * @static
             * @param {xunxian.scene.IKickOutEvent=} [properties] Properties to set
             * @returns {xunxian.scene.KickOutEvent} KickOutEvent instance
             */
            KickOutEvent.create = function create(properties) {
                return new KickOutEvent(properties);
            };

            /**
             * Encodes the specified KickOutEvent message. Does not implicitly {@link xunxian.scene.KickOutEvent.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.KickOutEvent
             * @static
             * @param {xunxian.scene.IKickOutEvent} message KickOutEvent message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            KickOutEvent.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.reason != null && Object.hasOwnProperty.call(message, "reason"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.reason);
                return writer;
            };

            /**
             * Encodes the specified KickOutEvent message, length delimited. Does not implicitly {@link xunxian.scene.KickOutEvent.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.KickOutEvent
             * @static
             * @param {xunxian.scene.IKickOutEvent} message KickOutEvent message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            KickOutEvent.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a KickOutEvent message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.KickOutEvent
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.KickOutEvent} KickOutEvent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            KickOutEvent.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.KickOutEvent();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.reason = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a KickOutEvent message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.KickOutEvent
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.KickOutEvent} KickOutEvent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            KickOutEvent.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a KickOutEvent message.
             * @function verify
             * @memberof xunxian.scene.KickOutEvent
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            KickOutEvent.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.reason != null && Object.hasOwnProperty.call(message, "reason"))
                    if (!$util.isString(message.reason))
                        return "reason: string expected";
                return null;
            };

            /**
             * Creates a KickOutEvent message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.KickOutEvent
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.KickOutEvent} KickOutEvent
             */
            KickOutEvent.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.KickOutEvent)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.KickOutEvent: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.KickOutEvent();
                if (object.reason != null)
                    message.reason = String(object.reason);
                return message;
            };

            /**
             * Creates a plain object from a KickOutEvent message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.KickOutEvent
             * @static
             * @param {xunxian.scene.KickOutEvent} message KickOutEvent
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            KickOutEvent.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults)
                    object.reason = "";
                if (message.reason != null && Object.hasOwnProperty.call(message, "reason"))
                    object.reason = message.reason;
                return object;
            };

            /**
             * Converts this KickOutEvent to JSON.
             * @function toJSON
             * @memberof xunxian.scene.KickOutEvent
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            KickOutEvent.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for KickOutEvent
             * @function getTypeUrl
             * @memberof xunxian.scene.KickOutEvent
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            KickOutEvent.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.KickOutEvent";
            };

            return KickOutEvent;
        })();

        scene.ReconnectRequest = (function() {

            /**
             * Properties of a ReconnectRequest.
             * @memberof xunxian.scene
             * @interface IReconnectRequest
             * @property {string|null} [token] ReconnectRequest token
             * @property {number|Long|null} [playerId] ReconnectRequest playerId
             * @property {number|null} [lastSeq] ReconnectRequest lastSeq
             */

            /**
             * Constructs a new ReconnectRequest.
             * @memberof xunxian.scene
             * @classdesc Represents a ReconnectRequest.
             * @implements IReconnectRequest
             * @constructor
             * @param {xunxian.scene.IReconnectRequest=} [properties] Properties to set
             */
            function ReconnectRequest(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ReconnectRequest token.
             * @member {string} token
             * @memberof xunxian.scene.ReconnectRequest
             * @instance
             */
            ReconnectRequest.prototype.token = "";

            /**
             * ReconnectRequest playerId.
             * @member {number|Long} playerId
             * @memberof xunxian.scene.ReconnectRequest
             * @instance
             */
            ReconnectRequest.prototype.playerId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * ReconnectRequest lastSeq.
             * @member {number} lastSeq
             * @memberof xunxian.scene.ReconnectRequest
             * @instance
             */
            ReconnectRequest.prototype.lastSeq = 0;

            /**
             * Creates a new ReconnectRequest instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.ReconnectRequest
             * @static
             * @param {xunxian.scene.IReconnectRequest=} [properties] Properties to set
             * @returns {xunxian.scene.ReconnectRequest} ReconnectRequest instance
             */
            ReconnectRequest.create = function create(properties) {
                return new ReconnectRequest(properties);
            };

            /**
             * Encodes the specified ReconnectRequest message. Does not implicitly {@link xunxian.scene.ReconnectRequest.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.ReconnectRequest
             * @static
             * @param {xunxian.scene.IReconnectRequest} message ReconnectRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ReconnectRequest.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.token);
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int64(message.playerId);
                if (message.lastSeq != null && Object.hasOwnProperty.call(message, "lastSeq"))
                    writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.lastSeq);
                return writer;
            };

            /**
             * Encodes the specified ReconnectRequest message, length delimited. Does not implicitly {@link xunxian.scene.ReconnectRequest.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.ReconnectRequest
             * @static
             * @param {xunxian.scene.IReconnectRequest} message ReconnectRequest message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ReconnectRequest.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a ReconnectRequest message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.ReconnectRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.ReconnectRequest} ReconnectRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ReconnectRequest.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.ReconnectRequest();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.token = reader.string();
                            break;
                        }
                    case 2: {
                            message.playerId = reader.int64();
                            break;
                        }
                    case 3: {
                            message.lastSeq = reader.uint32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ReconnectRequest message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.ReconnectRequest
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.ReconnectRequest} ReconnectRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ReconnectRequest.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ReconnectRequest message.
             * @function verify
             * @memberof xunxian.scene.ReconnectRequest
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ReconnectRequest.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    if (!$util.isString(message.token))
                        return "token: string expected";
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (!$util.isInteger(message.playerId) && !(message.playerId && $util.isInteger(message.playerId.low) && $util.isInteger(message.playerId.high)))
                        return "playerId: integer|Long expected";
                if (message.lastSeq != null && Object.hasOwnProperty.call(message, "lastSeq"))
                    if (!$util.isInteger(message.lastSeq))
                        return "lastSeq: integer expected";
                return null;
            };

            /**
             * Creates a ReconnectRequest message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.ReconnectRequest
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.ReconnectRequest} ReconnectRequest
             */
            ReconnectRequest.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.ReconnectRequest)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.ReconnectRequest: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.ReconnectRequest();
                if (object.token != null)
                    message.token = String(object.token);
                if (object.playerId != null)
                    if ($util.Long)
                        message.playerId = $util.Long.fromValue(object.playerId, false);
                    else if (typeof object.playerId === "string")
                        message.playerId = parseInt(object.playerId, 10);
                    else if (typeof object.playerId === "number")
                        message.playerId = object.playerId;
                    else if (typeof object.playerId === "object")
                        message.playerId = new $util.LongBits(object.playerId.low >>> 0, object.playerId.high >>> 0).toNumber();
                if (object.lastSeq != null)
                    message.lastSeq = object.lastSeq >>> 0;
                return message;
            };

            /**
             * Creates a plain object from a ReconnectRequest message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.ReconnectRequest
             * @static
             * @param {xunxian.scene.ReconnectRequest} message ReconnectRequest
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ReconnectRequest.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.token = "";
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.playerId = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : typeof BigInt !== "undefined" && options.longs === BigInt ? long.toBigInt() : long;
                    } else
                        object.playerId = options.longs === String ? "0" : typeof BigInt !== "undefined" && options.longs === BigInt ? BigInt("0") : 0;
                    object.lastSeq = 0;
                }
                if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                    object.token = message.token;
                if (message.playerId != null && Object.hasOwnProperty.call(message, "playerId"))
                    if (typeof BigInt !== "undefined" && options.longs === BigInt)
                        object.playerId = typeof message.playerId === "number" ? BigInt(message.playerId) : $util.Long.fromBits(message.playerId.low >>> 0, message.playerId.high >>> 0, false).toBigInt();
                    else if (typeof message.playerId === "number")
                        object.playerId = options.longs === String ? String(message.playerId) : message.playerId;
                    else
                        object.playerId = options.longs === String ? $util.Long.prototype.toString.call(message.playerId) : options.longs === Number ? new $util.LongBits(message.playerId.low >>> 0, message.playerId.high >>> 0).toNumber() : message.playerId;
                if (message.lastSeq != null && Object.hasOwnProperty.call(message, "lastSeq"))
                    object.lastSeq = message.lastSeq;
                return object;
            };

            /**
             * Converts this ReconnectRequest to JSON.
             * @function toJSON
             * @memberof xunxian.scene.ReconnectRequest
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ReconnectRequest.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ReconnectRequest
             * @function getTypeUrl
             * @memberof xunxian.scene.ReconnectRequest
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ReconnectRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.ReconnectRequest";
            };

            return ReconnectRequest;
        })();

        scene.ReconnectResponse = (function() {

            /**
             * Properties of a ReconnectResponse.
             * @memberof xunxian.scene
             * @interface IReconnectResponse
             * @property {number|null} [code] ReconnectResponse code
             * @property {string|null} [msg] ReconnectResponse msg
             * @property {Array.<xunxian.scene.IEntityState>|null} [entities] ReconnectResponse entities
             * @property {number|null} [posX] ReconnectResponse posX
             * @property {number|null} [posY] ReconnectResponse posY
             * @property {number|null} [serverSeq] ReconnectResponse serverSeq
             */

            /**
             * Constructs a new ReconnectResponse.
             * @memberof xunxian.scene
             * @classdesc Represents a ReconnectResponse.
             * @implements IReconnectResponse
             * @constructor
             * @param {xunxian.scene.IReconnectResponse=} [properties] Properties to set
             */
            function ReconnectResponse(properties) {
                this.entities = [];
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ReconnectResponse code.
             * @member {number} code
             * @memberof xunxian.scene.ReconnectResponse
             * @instance
             */
            ReconnectResponse.prototype.code = 0;

            /**
             * ReconnectResponse msg.
             * @member {string} msg
             * @memberof xunxian.scene.ReconnectResponse
             * @instance
             */
            ReconnectResponse.prototype.msg = "";

            /**
             * ReconnectResponse entities.
             * @member {Array.<xunxian.scene.IEntityState>} entities
             * @memberof xunxian.scene.ReconnectResponse
             * @instance
             */
            ReconnectResponse.prototype.entities = $util.emptyArray;

            /**
             * ReconnectResponse posX.
             * @member {number} posX
             * @memberof xunxian.scene.ReconnectResponse
             * @instance
             */
            ReconnectResponse.prototype.posX = 0;

            /**
             * ReconnectResponse posY.
             * @member {number} posY
             * @memberof xunxian.scene.ReconnectResponse
             * @instance
             */
            ReconnectResponse.prototype.posY = 0;

            /**
             * ReconnectResponse serverSeq.
             * @member {number} serverSeq
             * @memberof xunxian.scene.ReconnectResponse
             * @instance
             */
            ReconnectResponse.prototype.serverSeq = 0;

            /**
             * Creates a new ReconnectResponse instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.ReconnectResponse
             * @static
             * @param {xunxian.scene.IReconnectResponse=} [properties] Properties to set
             * @returns {xunxian.scene.ReconnectResponse} ReconnectResponse instance
             */
            ReconnectResponse.create = function create(properties) {
                return new ReconnectResponse(properties);
            };

            /**
             * Encodes the specified ReconnectResponse message. Does not implicitly {@link xunxian.scene.ReconnectResponse.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.ReconnectResponse
             * @static
             * @param {xunxian.scene.IReconnectResponse} message ReconnectResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ReconnectResponse.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.msg);
                if (message.entities != null && message.entities.length)
                    for (var i = 0; i < message.entities.length; ++i)
                        $root.xunxian.scene.EntityState.encode(message.entities[i], writer.uint32(/* id 3, wireType 2 =*/26).fork(), q + 1).ldelim();
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    writer.uint32(/* id 4, wireType 5 =*/37).float(message.posX);
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    writer.uint32(/* id 5, wireType 5 =*/45).float(message.posY);
                if (message.serverSeq != null && Object.hasOwnProperty.call(message, "serverSeq"))
                    writer.uint32(/* id 6, wireType 0 =*/48).uint32(message.serverSeq);
                return writer;
            };

            /**
             * Encodes the specified ReconnectResponse message, length delimited. Does not implicitly {@link xunxian.scene.ReconnectResponse.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.ReconnectResponse
             * @static
             * @param {xunxian.scene.IReconnectResponse} message ReconnectResponse message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ReconnectResponse.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a ReconnectResponse message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.ReconnectResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.ReconnectResponse} ReconnectResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ReconnectResponse.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.ReconnectResponse();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.code = reader.int32();
                            break;
                        }
                    case 2: {
                            message.msg = reader.string();
                            break;
                        }
                    case 3: {
                            if (!(message.entities && message.entities.length))
                                message.entities = [];
                            message.entities.push($root.xunxian.scene.EntityState.decode(reader, reader.uint32(), undefined, long + 1));
                            break;
                        }
                    case 4: {
                            message.posX = reader.float();
                            break;
                        }
                    case 5: {
                            message.posY = reader.float();
                            break;
                        }
                    case 6: {
                            message.serverSeq = reader.uint32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a ReconnectResponse message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.ReconnectResponse
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.ReconnectResponse} ReconnectResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ReconnectResponse.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a ReconnectResponse message.
             * @function verify
             * @memberof xunxian.scene.ReconnectResponse
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            ReconnectResponse.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    if (!$util.isInteger(message.code))
                        return "code: integer expected";
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    if (!$util.isString(message.msg))
                        return "msg: string expected";
                if (message.entities != null && Object.hasOwnProperty.call(message, "entities")) {
                    if (!Array.isArray(message.entities))
                        return "entities: array expected";
                    for (var i = 0; i < message.entities.length; ++i) {
                        var error = $root.xunxian.scene.EntityState.verify(message.entities[i], long + 1);
                        if (error)
                            return "entities." + error;
                    }
                }
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    if (typeof message.posX !== "number")
                        return "posX: number expected";
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    if (typeof message.posY !== "number")
                        return "posY: number expected";
                if (message.serverSeq != null && Object.hasOwnProperty.call(message, "serverSeq"))
                    if (!$util.isInteger(message.serverSeq))
                        return "serverSeq: integer expected";
                return null;
            };

            /**
             * Creates a ReconnectResponse message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.ReconnectResponse
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.ReconnectResponse} ReconnectResponse
             */
            ReconnectResponse.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.ReconnectResponse)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.ReconnectResponse: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.ReconnectResponse();
                if (object.code != null)
                    message.code = object.code | 0;
                if (object.msg != null)
                    message.msg = String(object.msg);
                if (object.entities) {
                    if (!Array.isArray(object.entities))
                        throw TypeError(".xunxian.scene.ReconnectResponse.entities: array expected");
                    message.entities = [];
                    for (var i = 0; i < object.entities.length; ++i) {
                        if (!$util.isObject(object.entities[i]))
                            throw TypeError(".xunxian.scene.ReconnectResponse.entities: object expected");
                        message.entities[i] = $root.xunxian.scene.EntityState.fromObject(object.entities[i], long + 1);
                    }
                }
                if (object.posX != null)
                    message.posX = Number(object.posX);
                if (object.posY != null)
                    message.posY = Number(object.posY);
                if (object.serverSeq != null)
                    message.serverSeq = object.serverSeq >>> 0;
                return message;
            };

            /**
             * Creates a plain object from a ReconnectResponse message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.ReconnectResponse
             * @static
             * @param {xunxian.scene.ReconnectResponse} message ReconnectResponse
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ReconnectResponse.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.arrays || options.defaults)
                    object.entities = [];
                if (options.defaults) {
                    object.code = 0;
                    object.msg = "";
                    object.posX = 0;
                    object.posY = 0;
                    object.serverSeq = 0;
                }
                if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                    object.code = message.code;
                if (message.msg != null && Object.hasOwnProperty.call(message, "msg"))
                    object.msg = message.msg;
                if (message.entities && message.entities.length) {
                    object.entities = [];
                    for (var j = 0; j < message.entities.length; ++j)
                        object.entities[j] = $root.xunxian.scene.EntityState.toObject(message.entities[j], options, q + 1);
                }
                if (message.posX != null && Object.hasOwnProperty.call(message, "posX"))
                    object.posX = options.json && !isFinite(message.posX) ? String(message.posX) : message.posX;
                if (message.posY != null && Object.hasOwnProperty.call(message, "posY"))
                    object.posY = options.json && !isFinite(message.posY) ? String(message.posY) : message.posY;
                if (message.serverSeq != null && Object.hasOwnProperty.call(message, "serverSeq"))
                    object.serverSeq = message.serverSeq;
                return object;
            };

            /**
             * Converts this ReconnectResponse to JSON.
             * @function toJSON
             * @memberof xunxian.scene.ReconnectResponse
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ReconnectResponse.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for ReconnectResponse
             * @function getTypeUrl
             * @memberof xunxian.scene.ReconnectResponse
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            ReconnectResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.ReconnectResponse";
            };

            return ReconnectResponse;
        })();

        scene.WsMessage = (function() {

            /**
             * Properties of a WsMessage.
             * @memberof xunxian.scene
             * @interface IWsMessage
             * @property {string|null} [type] WsMessage type
             * @property {Uint8Array|null} [payload] WsMessage payload
             */

            /**
             * Constructs a new WsMessage.
             * @memberof xunxian.scene
             * @classdesc Represents a WsMessage.
             * @implements IWsMessage
             * @constructor
             * @param {xunxian.scene.IWsMessage=} [properties] Properties to set
             */
            function WsMessage(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null && keys[i] !== "__proto__")
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * WsMessage type.
             * @member {string} type
             * @memberof xunxian.scene.WsMessage
             * @instance
             */
            WsMessage.prototype.type = "";

            /**
             * WsMessage payload.
             * @member {Uint8Array} payload
             * @memberof xunxian.scene.WsMessage
             * @instance
             */
            WsMessage.prototype.payload = $util.newBuffer([]);

            /**
             * Creates a new WsMessage instance using the specified properties.
             * @function create
             * @memberof xunxian.scene.WsMessage
             * @static
             * @param {xunxian.scene.IWsMessage=} [properties] Properties to set
             * @returns {xunxian.scene.WsMessage} WsMessage instance
             */
            WsMessage.create = function create(properties) {
                return new WsMessage(properties);
            };

            /**
             * Encodes the specified WsMessage message. Does not implicitly {@link xunxian.scene.WsMessage.verify|verify} messages.
             * @function encode
             * @memberof xunxian.scene.WsMessage
             * @static
             * @param {xunxian.scene.IWsMessage} message WsMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            WsMessage.encode = function encode(message, writer, q) {
                if (!writer)
                    writer = $Writer.create();
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.type);
                if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.payload);
                return writer;
            };

            /**
             * Encodes the specified WsMessage message, length delimited. Does not implicitly {@link xunxian.scene.WsMessage.verify|verify} messages.
             * @function encodeDelimited
             * @memberof xunxian.scene.WsMessage
             * @static
             * @param {xunxian.scene.IWsMessage} message WsMessage message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            WsMessage.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
            };

            /**
             * Decodes a WsMessage message from the specified reader or buffer.
             * @function decode
             * @memberof xunxian.scene.WsMessage
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {xunxian.scene.WsMessage} WsMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            WsMessage.decode = function decode(reader, length, error, long) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                if (long === undefined)
                    long = 0;
                if (long > $Reader.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.xunxian.scene.WsMessage();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.type = reader.string();
                            break;
                        }
                    case 2: {
                            message.payload = reader.bytes();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7, long);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a WsMessage message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof xunxian.scene.WsMessage
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {xunxian.scene.WsMessage} WsMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            WsMessage.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a WsMessage message.
             * @function verify
             * @memberof xunxian.scene.WsMessage
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            WsMessage.verify = function verify(message, long) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    return "maximum nesting depth exceeded";
                if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                    if (!$util.isString(message.type))
                        return "type: string expected";
                if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
                    if (!(message.payload && typeof message.payload.length === "number" || $util.isString(message.payload)))
                        return "payload: buffer expected";
                return null;
            };

            /**
             * Creates a WsMessage message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof xunxian.scene.WsMessage
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {xunxian.scene.WsMessage} WsMessage
             */
            WsMessage.fromObject = function fromObject(object, long) {
                if (object instanceof $root.xunxian.scene.WsMessage)
                    return object;
                if (!$util.isObject(object))
                    throw TypeError(".xunxian.scene.WsMessage: object expected");
                if (long === undefined)
                    long = 0;
                if (long > $util.recursionLimit)
                    throw Error("maximum nesting depth exceeded");
                var message = new $root.xunxian.scene.WsMessage();
                if (object.type != null)
                    message.type = String(object.type);
                if (object.payload != null)
                    if (typeof object.payload === "string")
                        $util.base64.decode(object.payload, message.payload = $util.newBuffer($util.base64.length(object.payload)), 0);
                    else if (object.payload.length >= 0)
                        message.payload = object.payload;
                return message;
            };

            /**
             * Creates a plain object from a WsMessage message. Also converts values to other types if specified.
             * @function toObject
             * @memberof xunxian.scene.WsMessage
             * @static
             * @param {xunxian.scene.WsMessage} message WsMessage
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            WsMessage.toObject = function toObject(message, options, q) {
                if (!options)
                    options = {};
                if (q === undefined)
                    q = 0;
                if (q > $util.recursionLimit)
                    throw Error("max depth exceeded");
                var object = {};
                if (options.defaults) {
                    object.type = "";
                    if (options.bytes === String)
                        object.payload = "";
                    else {
                        object.payload = [];
                        if (options.bytes !== Array)
                            object.payload = $util.newBuffer(object.payload);
                    }
                }
                if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                    object.type = message.type;
                if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
                    object.payload = options.bytes === String ? $util.base64.encode(message.payload, 0, message.payload.length) : options.bytes === Array ? Array.prototype.slice.call(message.payload) : message.payload;
                return object;
            };

            /**
             * Converts this WsMessage to JSON.
             * @function toJSON
             * @memberof xunxian.scene.WsMessage
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            WsMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for WsMessage
             * @function getTypeUrl
             * @memberof xunxian.scene.WsMessage
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            WsMessage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/xunxian.scene.WsMessage";
            };

            return WsMessage;
        })();

        return scene;
    })();

    return xunxian;
})();

module.exports = $root;
