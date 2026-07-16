import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace xunxian. */
export namespace xunxian {

    /** Namespace auth. */
    namespace auth {

        /** Properties of a WxLoginRequest. */
        interface IWxLoginRequest {

            /** WxLoginRequest code */
            code?: (string|null);

            /** WxLoginRequest deviceId */
            deviceId?: (string|null);
        }

        /** Represents a WxLoginRequest. */
        class WxLoginRequest implements IWxLoginRequest {

            /**
             * Constructs a new WxLoginRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.IWxLoginRequest);

            /** WxLoginRequest code. */
            public code: string;

            /** WxLoginRequest deviceId. */
            public deviceId: string;

            /**
             * Creates a new WxLoginRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns WxLoginRequest instance
             */
            public static create(properties?: xunxian.auth.IWxLoginRequest): xunxian.auth.WxLoginRequest;

            /**
             * Encodes the specified WxLoginRequest message. Does not implicitly {@link xunxian.auth.WxLoginRequest.verify|verify} messages.
             * @param message WxLoginRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.IWxLoginRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified WxLoginRequest message, length delimited. Does not implicitly {@link xunxian.auth.WxLoginRequest.verify|verify} messages.
             * @param message WxLoginRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.IWxLoginRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a WxLoginRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns WxLoginRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.WxLoginRequest;

            /**
             * Decodes a WxLoginRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns WxLoginRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.WxLoginRequest;

            /**
             * Verifies a WxLoginRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a WxLoginRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns WxLoginRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.WxLoginRequest;

            /**
             * Creates a plain object from a WxLoginRequest message. Also converts values to other types if specified.
             * @param message WxLoginRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.WxLoginRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this WxLoginRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for WxLoginRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a WxLoginResponse. */
        interface IWxLoginResponse {

            /** WxLoginResponse code */
            code?: (number|null);

            /** WxLoginResponse msg */
            msg?: (string|null);

            /** WxLoginResponse token */
            token?: (string|null);

            /** WxLoginResponse refreshToken */
            refreshToken?: (string|null);

            /** WxLoginResponse needBindPhone */
            needBindPhone?: (boolean|null);

            /** WxLoginResponse openid */
            openid?: (string|null);

            /** WxLoginResponse hasCharacter */
            hasCharacter?: (boolean|null);

            /** WxLoginResponse playerInfo */
            playerInfo?: (xunxian.auth.IPlayerBrief|null);
        }

        /** Represents a WxLoginResponse. */
        class WxLoginResponse implements IWxLoginResponse {

            /**
             * Constructs a new WxLoginResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.IWxLoginResponse);

            /** WxLoginResponse code. */
            public code: number;

            /** WxLoginResponse msg. */
            public msg: string;

            /** WxLoginResponse token. */
            public token: string;

            /** WxLoginResponse refreshToken. */
            public refreshToken: string;

            /** WxLoginResponse needBindPhone. */
            public needBindPhone: boolean;

            /** WxLoginResponse openid. */
            public openid: string;

            /** WxLoginResponse hasCharacter. */
            public hasCharacter: boolean;

            /** WxLoginResponse playerInfo. */
            public playerInfo?: (xunxian.auth.IPlayerBrief|null);

            /**
             * Creates a new WxLoginResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns WxLoginResponse instance
             */
            public static create(properties?: xunxian.auth.IWxLoginResponse): xunxian.auth.WxLoginResponse;

            /**
             * Encodes the specified WxLoginResponse message. Does not implicitly {@link xunxian.auth.WxLoginResponse.verify|verify} messages.
             * @param message WxLoginResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.IWxLoginResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified WxLoginResponse message, length delimited. Does not implicitly {@link xunxian.auth.WxLoginResponse.verify|verify} messages.
             * @param message WxLoginResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.IWxLoginResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a WxLoginResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns WxLoginResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.WxLoginResponse;

            /**
             * Decodes a WxLoginResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns WxLoginResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.WxLoginResponse;

            /**
             * Verifies a WxLoginResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a WxLoginResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns WxLoginResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.WxLoginResponse;

            /**
             * Creates a plain object from a WxLoginResponse message. Also converts values to other types if specified.
             * @param message WxLoginResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.WxLoginResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this WxLoginResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for WxLoginResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a TtLoginRequest. */
        interface ITtLoginRequest {

            /** TtLoginRequest code */
            code?: (string|null);

            /** TtLoginRequest deviceId */
            deviceId?: (string|null);
        }

        /** Represents a TtLoginRequest. */
        class TtLoginRequest implements ITtLoginRequest {

            /**
             * Constructs a new TtLoginRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.ITtLoginRequest);

            /** TtLoginRequest code. */
            public code: string;

            /** TtLoginRequest deviceId. */
            public deviceId: string;

            /**
             * Creates a new TtLoginRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns TtLoginRequest instance
             */
            public static create(properties?: xunxian.auth.ITtLoginRequest): xunxian.auth.TtLoginRequest;

            /**
             * Encodes the specified TtLoginRequest message. Does not implicitly {@link xunxian.auth.TtLoginRequest.verify|verify} messages.
             * @param message TtLoginRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.ITtLoginRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified TtLoginRequest message, length delimited. Does not implicitly {@link xunxian.auth.TtLoginRequest.verify|verify} messages.
             * @param message TtLoginRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.ITtLoginRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a TtLoginRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns TtLoginRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.TtLoginRequest;

            /**
             * Decodes a TtLoginRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns TtLoginRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.TtLoginRequest;

            /**
             * Verifies a TtLoginRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a TtLoginRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns TtLoginRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.TtLoginRequest;

            /**
             * Creates a plain object from a TtLoginRequest message. Also converts values to other types if specified.
             * @param message TtLoginRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.TtLoginRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this TtLoginRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for TtLoginRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a TtLoginResponse. */
        interface ITtLoginResponse {

            /** TtLoginResponse code */
            code?: (number|null);

            /** TtLoginResponse msg */
            msg?: (string|null);

            /** TtLoginResponse token */
            token?: (string|null);

            /** TtLoginResponse refreshToken */
            refreshToken?: (string|null);

            /** TtLoginResponse needBindPhone */
            needBindPhone?: (boolean|null);

            /** TtLoginResponse openid */
            openid?: (string|null);

            /** TtLoginResponse hasCharacter */
            hasCharacter?: (boolean|null);

            /** TtLoginResponse needConfirm */
            needConfirm?: (boolean|null);

            /** TtLoginResponse playerInfo */
            playerInfo?: (xunxian.auth.IPlayerBrief|null);
        }

        /** Represents a TtLoginResponse. */
        class TtLoginResponse implements ITtLoginResponse {

            /**
             * Constructs a new TtLoginResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.ITtLoginResponse);

            /** TtLoginResponse code. */
            public code: number;

            /** TtLoginResponse msg. */
            public msg: string;

            /** TtLoginResponse token. */
            public token: string;

            /** TtLoginResponse refreshToken. */
            public refreshToken: string;

            /** TtLoginResponse needBindPhone. */
            public needBindPhone: boolean;

            /** TtLoginResponse openid. */
            public openid: string;

            /** TtLoginResponse hasCharacter. */
            public hasCharacter: boolean;

            /** TtLoginResponse needConfirm. */
            public needConfirm: boolean;

            /** TtLoginResponse playerInfo. */
            public playerInfo?: (xunxian.auth.IPlayerBrief|null);

            /**
             * Creates a new TtLoginResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns TtLoginResponse instance
             */
            public static create(properties?: xunxian.auth.ITtLoginResponse): xunxian.auth.TtLoginResponse;

            /**
             * Encodes the specified TtLoginResponse message. Does not implicitly {@link xunxian.auth.TtLoginResponse.verify|verify} messages.
             * @param message TtLoginResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.ITtLoginResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified TtLoginResponse message, length delimited. Does not implicitly {@link xunxian.auth.TtLoginResponse.verify|verify} messages.
             * @param message TtLoginResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.ITtLoginResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a TtLoginResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns TtLoginResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.TtLoginResponse;

            /**
             * Decodes a TtLoginResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns TtLoginResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.TtLoginResponse;

            /**
             * Verifies a TtLoginResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a TtLoginResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns TtLoginResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.TtLoginResponse;

            /**
             * Creates a plain object from a TtLoginResponse message. Also converts values to other types if specified.
             * @param message TtLoginResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.TtLoginResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this TtLoginResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for TtLoginResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a PhoneLoginRequest. */
        interface IPhoneLoginRequest {

            /** PhoneLoginRequest phone */
            phone?: (string|null);

            /** PhoneLoginRequest code */
            code?: (string|null);

            /** PhoneLoginRequest deviceId */
            deviceId?: (string|null);
        }

        /** Represents a PhoneLoginRequest. */
        class PhoneLoginRequest implements IPhoneLoginRequest {

            /**
             * Constructs a new PhoneLoginRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.IPhoneLoginRequest);

            /** PhoneLoginRequest phone. */
            public phone: string;

            /** PhoneLoginRequest code. */
            public code: string;

            /** PhoneLoginRequest deviceId. */
            public deviceId: string;

            /**
             * Creates a new PhoneLoginRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PhoneLoginRequest instance
             */
            public static create(properties?: xunxian.auth.IPhoneLoginRequest): xunxian.auth.PhoneLoginRequest;

            /**
             * Encodes the specified PhoneLoginRequest message. Does not implicitly {@link xunxian.auth.PhoneLoginRequest.verify|verify} messages.
             * @param message PhoneLoginRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.IPhoneLoginRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PhoneLoginRequest message, length delimited. Does not implicitly {@link xunxian.auth.PhoneLoginRequest.verify|verify} messages.
             * @param message PhoneLoginRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.IPhoneLoginRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PhoneLoginRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns PhoneLoginRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.PhoneLoginRequest;

            /**
             * Decodes a PhoneLoginRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PhoneLoginRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.PhoneLoginRequest;

            /**
             * Verifies a PhoneLoginRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a PhoneLoginRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns PhoneLoginRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.PhoneLoginRequest;

            /**
             * Creates a plain object from a PhoneLoginRequest message. Also converts values to other types if specified.
             * @param message PhoneLoginRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.PhoneLoginRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this PhoneLoginRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for PhoneLoginRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a PhoneLoginResponse. */
        interface IPhoneLoginResponse {

            /** PhoneLoginResponse code */
            code?: (number|null);

            /** PhoneLoginResponse msg */
            msg?: (string|null);

            /** PhoneLoginResponse token */
            token?: (string|null);

            /** PhoneLoginResponse refreshToken */
            refreshToken?: (string|null);

            /** PhoneLoginResponse hasCharacter */
            hasCharacter?: (boolean|null);

            /** PhoneLoginResponse playerInfo */
            playerInfo?: (xunxian.auth.IPlayerBrief|null);
        }

        /** Represents a PhoneLoginResponse. */
        class PhoneLoginResponse implements IPhoneLoginResponse {

            /**
             * Constructs a new PhoneLoginResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.IPhoneLoginResponse);

            /** PhoneLoginResponse code. */
            public code: number;

            /** PhoneLoginResponse msg. */
            public msg: string;

            /** PhoneLoginResponse token. */
            public token: string;

            /** PhoneLoginResponse refreshToken. */
            public refreshToken: string;

            /** PhoneLoginResponse hasCharacter. */
            public hasCharacter: boolean;

            /** PhoneLoginResponse playerInfo. */
            public playerInfo?: (xunxian.auth.IPlayerBrief|null);

            /**
             * Creates a new PhoneLoginResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PhoneLoginResponse instance
             */
            public static create(properties?: xunxian.auth.IPhoneLoginResponse): xunxian.auth.PhoneLoginResponse;

            /**
             * Encodes the specified PhoneLoginResponse message. Does not implicitly {@link xunxian.auth.PhoneLoginResponse.verify|verify} messages.
             * @param message PhoneLoginResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.IPhoneLoginResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PhoneLoginResponse message, length delimited. Does not implicitly {@link xunxian.auth.PhoneLoginResponse.verify|verify} messages.
             * @param message PhoneLoginResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.IPhoneLoginResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PhoneLoginResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns PhoneLoginResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.PhoneLoginResponse;

            /**
             * Decodes a PhoneLoginResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PhoneLoginResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.PhoneLoginResponse;

            /**
             * Verifies a PhoneLoginResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a PhoneLoginResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns PhoneLoginResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.PhoneLoginResponse;

            /**
             * Creates a plain object from a PhoneLoginResponse message. Also converts values to other types if specified.
             * @param message PhoneLoginResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.PhoneLoginResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this PhoneLoginResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for PhoneLoginResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a SendCodeRequest. */
        interface ISendCodeRequest {

            /** SendCodeRequest phone */
            phone?: (string|null);

            /** SendCodeRequest purpose */
            purpose?: (string|null);
        }

        /** Represents a SendCodeRequest. */
        class SendCodeRequest implements ISendCodeRequest {

            /**
             * Constructs a new SendCodeRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.ISendCodeRequest);

            /** SendCodeRequest phone. */
            public phone: string;

            /** SendCodeRequest purpose. */
            public purpose: string;

            /**
             * Creates a new SendCodeRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SendCodeRequest instance
             */
            public static create(properties?: xunxian.auth.ISendCodeRequest): xunxian.auth.SendCodeRequest;

            /**
             * Encodes the specified SendCodeRequest message. Does not implicitly {@link xunxian.auth.SendCodeRequest.verify|verify} messages.
             * @param message SendCodeRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.ISendCodeRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SendCodeRequest message, length delimited. Does not implicitly {@link xunxian.auth.SendCodeRequest.verify|verify} messages.
             * @param message SendCodeRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.ISendCodeRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SendCodeRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SendCodeRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.SendCodeRequest;

            /**
             * Decodes a SendCodeRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SendCodeRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.SendCodeRequest;

            /**
             * Verifies a SendCodeRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SendCodeRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SendCodeRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.SendCodeRequest;

            /**
             * Creates a plain object from a SendCodeRequest message. Also converts values to other types if specified.
             * @param message SendCodeRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.SendCodeRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SendCodeRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SendCodeRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a SendCodeResponse. */
        interface ISendCodeResponse {

            /** SendCodeResponse code */
            code?: (number|null);

            /** SendCodeResponse msg */
            msg?: (string|null);

            /** SendCodeResponse success */
            success?: (boolean|null);
        }

        /** Represents a SendCodeResponse. */
        class SendCodeResponse implements ISendCodeResponse {

            /**
             * Constructs a new SendCodeResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.ISendCodeResponse);

            /** SendCodeResponse code. */
            public code: number;

            /** SendCodeResponse msg. */
            public msg: string;

            /** SendCodeResponse success. */
            public success: boolean;

            /**
             * Creates a new SendCodeResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SendCodeResponse instance
             */
            public static create(properties?: xunxian.auth.ISendCodeResponse): xunxian.auth.SendCodeResponse;

            /**
             * Encodes the specified SendCodeResponse message. Does not implicitly {@link xunxian.auth.SendCodeResponse.verify|verify} messages.
             * @param message SendCodeResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.ISendCodeResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SendCodeResponse message, length delimited. Does not implicitly {@link xunxian.auth.SendCodeResponse.verify|verify} messages.
             * @param message SendCodeResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.ISendCodeResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SendCodeResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SendCodeResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.SendCodeResponse;

            /**
             * Decodes a SendCodeResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SendCodeResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.SendCodeResponse;

            /**
             * Verifies a SendCodeResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SendCodeResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SendCodeResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.SendCodeResponse;

            /**
             * Creates a plain object from a SendCodeResponse message. Also converts values to other types if specified.
             * @param message SendCodeResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.SendCodeResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SendCodeResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SendCodeResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a BindPhoneRequest. */
        interface IBindPhoneRequest {

            /** BindPhoneRequest openid */
            openid?: (string|null);

            /** BindPhoneRequest platform */
            platform?: (string|null);

            /** BindPhoneRequest phone */
            phone?: (string|null);

            /** BindPhoneRequest code */
            code?: (string|null);
        }

        /** Represents a BindPhoneRequest. */
        class BindPhoneRequest implements IBindPhoneRequest {

            /**
             * Constructs a new BindPhoneRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.IBindPhoneRequest);

            /** BindPhoneRequest openid. */
            public openid: string;

            /** BindPhoneRequest platform. */
            public platform: string;

            /** BindPhoneRequest phone. */
            public phone: string;

            /** BindPhoneRequest code. */
            public code: string;

            /**
             * Creates a new BindPhoneRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns BindPhoneRequest instance
             */
            public static create(properties?: xunxian.auth.IBindPhoneRequest): xunxian.auth.BindPhoneRequest;

            /**
             * Encodes the specified BindPhoneRequest message. Does not implicitly {@link xunxian.auth.BindPhoneRequest.verify|verify} messages.
             * @param message BindPhoneRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.IBindPhoneRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified BindPhoneRequest message, length delimited. Does not implicitly {@link xunxian.auth.BindPhoneRequest.verify|verify} messages.
             * @param message BindPhoneRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.IBindPhoneRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a BindPhoneRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns BindPhoneRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.BindPhoneRequest;

            /**
             * Decodes a BindPhoneRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns BindPhoneRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.BindPhoneRequest;

            /**
             * Verifies a BindPhoneRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a BindPhoneRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns BindPhoneRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.BindPhoneRequest;

            /**
             * Creates a plain object from a BindPhoneRequest message. Also converts values to other types if specified.
             * @param message BindPhoneRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.BindPhoneRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this BindPhoneRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for BindPhoneRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a BindPhoneResponse. */
        interface IBindPhoneResponse {

            /** BindPhoneResponse code */
            code?: (number|null);

            /** BindPhoneResponse msg */
            msg?: (string|null);

            /** BindPhoneResponse token */
            token?: (string|null);

            /** BindPhoneResponse refreshToken */
            refreshToken?: (string|null);

            /** BindPhoneResponse hasCharacter */
            hasCharacter?: (boolean|null);

            /** BindPhoneResponse needConfirm */
            needConfirm?: (boolean|null);

            /** BindPhoneResponse playerInfo */
            playerInfo?: (xunxian.auth.IPlayerBrief|null);
        }

        /** Represents a BindPhoneResponse. */
        class BindPhoneResponse implements IBindPhoneResponse {

            /**
             * Constructs a new BindPhoneResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.IBindPhoneResponse);

            /** BindPhoneResponse code. */
            public code: number;

            /** BindPhoneResponse msg. */
            public msg: string;

            /** BindPhoneResponse token. */
            public token: string;

            /** BindPhoneResponse refreshToken. */
            public refreshToken: string;

            /** BindPhoneResponse hasCharacter. */
            public hasCharacter: boolean;

            /** BindPhoneResponse needConfirm. */
            public needConfirm: boolean;

            /** BindPhoneResponse playerInfo. */
            public playerInfo?: (xunxian.auth.IPlayerBrief|null);

            /**
             * Creates a new BindPhoneResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns BindPhoneResponse instance
             */
            public static create(properties?: xunxian.auth.IBindPhoneResponse): xunxian.auth.BindPhoneResponse;

            /**
             * Encodes the specified BindPhoneResponse message. Does not implicitly {@link xunxian.auth.BindPhoneResponse.verify|verify} messages.
             * @param message BindPhoneResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.IBindPhoneResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified BindPhoneResponse message, length delimited. Does not implicitly {@link xunxian.auth.BindPhoneResponse.verify|verify} messages.
             * @param message BindPhoneResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.IBindPhoneResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a BindPhoneResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns BindPhoneResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.BindPhoneResponse;

            /**
             * Decodes a BindPhoneResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns BindPhoneResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.BindPhoneResponse;

            /**
             * Verifies a BindPhoneResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a BindPhoneResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns BindPhoneResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.BindPhoneResponse;

            /**
             * Creates a plain object from a BindPhoneResponse message. Also converts values to other types if specified.
             * @param message BindPhoneResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.BindPhoneResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this BindPhoneResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for BindPhoneResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a ConfirmBindRequest. */
        interface IConfirmBindRequest {

            /** ConfirmBindRequest openid */
            openid?: (string|null);

            /** ConfirmBindRequest platform */
            platform?: (string|null);

            /** ConfirmBindRequest phone */
            phone?: (string|null);
        }

        /** Represents a ConfirmBindRequest. */
        class ConfirmBindRequest implements IConfirmBindRequest {

            /**
             * Constructs a new ConfirmBindRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.IConfirmBindRequest);

            /** ConfirmBindRequest openid. */
            public openid: string;

            /** ConfirmBindRequest platform. */
            public platform: string;

            /** ConfirmBindRequest phone. */
            public phone: string;

            /**
             * Creates a new ConfirmBindRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ConfirmBindRequest instance
             */
            public static create(properties?: xunxian.auth.IConfirmBindRequest): xunxian.auth.ConfirmBindRequest;

            /**
             * Encodes the specified ConfirmBindRequest message. Does not implicitly {@link xunxian.auth.ConfirmBindRequest.verify|verify} messages.
             * @param message ConfirmBindRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.IConfirmBindRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ConfirmBindRequest message, length delimited. Does not implicitly {@link xunxian.auth.ConfirmBindRequest.verify|verify} messages.
             * @param message ConfirmBindRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.IConfirmBindRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ConfirmBindRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ConfirmBindRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.ConfirmBindRequest;

            /**
             * Decodes a ConfirmBindRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ConfirmBindRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.ConfirmBindRequest;

            /**
             * Verifies a ConfirmBindRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ConfirmBindRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ConfirmBindRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.ConfirmBindRequest;

            /**
             * Creates a plain object from a ConfirmBindRequest message. Also converts values to other types if specified.
             * @param message ConfirmBindRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.ConfirmBindRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ConfirmBindRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ConfirmBindRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a ConfirmBindResponse. */
        interface IConfirmBindResponse {

            /** ConfirmBindResponse code */
            code?: (number|null);

            /** ConfirmBindResponse msg */
            msg?: (string|null);

            /** ConfirmBindResponse token */
            token?: (string|null);

            /** ConfirmBindResponse refreshToken */
            refreshToken?: (string|null);

            /** ConfirmBindResponse hasCharacter */
            hasCharacter?: (boolean|null);

            /** ConfirmBindResponse playerInfo */
            playerInfo?: (xunxian.auth.IPlayerBrief|null);
        }

        /** Represents a ConfirmBindResponse. */
        class ConfirmBindResponse implements IConfirmBindResponse {

            /**
             * Constructs a new ConfirmBindResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.IConfirmBindResponse);

            /** ConfirmBindResponse code. */
            public code: number;

            /** ConfirmBindResponse msg. */
            public msg: string;

            /** ConfirmBindResponse token. */
            public token: string;

            /** ConfirmBindResponse refreshToken. */
            public refreshToken: string;

            /** ConfirmBindResponse hasCharacter. */
            public hasCharacter: boolean;

            /** ConfirmBindResponse playerInfo. */
            public playerInfo?: (xunxian.auth.IPlayerBrief|null);

            /**
             * Creates a new ConfirmBindResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ConfirmBindResponse instance
             */
            public static create(properties?: xunxian.auth.IConfirmBindResponse): xunxian.auth.ConfirmBindResponse;

            /**
             * Encodes the specified ConfirmBindResponse message. Does not implicitly {@link xunxian.auth.ConfirmBindResponse.verify|verify} messages.
             * @param message ConfirmBindResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.IConfirmBindResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ConfirmBindResponse message, length delimited. Does not implicitly {@link xunxian.auth.ConfirmBindResponse.verify|verify} messages.
             * @param message ConfirmBindResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.IConfirmBindResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ConfirmBindResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ConfirmBindResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.ConfirmBindResponse;

            /**
             * Decodes a ConfirmBindResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ConfirmBindResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.ConfirmBindResponse;

            /**
             * Verifies a ConfirmBindResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ConfirmBindResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ConfirmBindResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.ConfirmBindResponse;

            /**
             * Creates a plain object from a ConfirmBindResponse message. Also converts values to other types if specified.
             * @param message ConfirmBindResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.ConfirmBindResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ConfirmBindResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ConfirmBindResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a RefreshTokenRequest. */
        interface IRefreshTokenRequest {

            /** RefreshTokenRequest refreshToken */
            refreshToken?: (string|null);
        }

        /** Represents a RefreshTokenRequest. */
        class RefreshTokenRequest implements IRefreshTokenRequest {

            /**
             * Constructs a new RefreshTokenRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.IRefreshTokenRequest);

            /** RefreshTokenRequest refreshToken. */
            public refreshToken: string;

            /**
             * Creates a new RefreshTokenRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RefreshTokenRequest instance
             */
            public static create(properties?: xunxian.auth.IRefreshTokenRequest): xunxian.auth.RefreshTokenRequest;

            /**
             * Encodes the specified RefreshTokenRequest message. Does not implicitly {@link xunxian.auth.RefreshTokenRequest.verify|verify} messages.
             * @param message RefreshTokenRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.IRefreshTokenRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RefreshTokenRequest message, length delimited. Does not implicitly {@link xunxian.auth.RefreshTokenRequest.verify|verify} messages.
             * @param message RefreshTokenRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.IRefreshTokenRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RefreshTokenRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns RefreshTokenRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.RefreshTokenRequest;

            /**
             * Decodes a RefreshTokenRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RefreshTokenRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.RefreshTokenRequest;

            /**
             * Verifies a RefreshTokenRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a RefreshTokenRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns RefreshTokenRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.RefreshTokenRequest;

            /**
             * Creates a plain object from a RefreshTokenRequest message. Also converts values to other types if specified.
             * @param message RefreshTokenRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.RefreshTokenRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this RefreshTokenRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for RefreshTokenRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a RefreshTokenResponse. */
        interface IRefreshTokenResponse {

            /** RefreshTokenResponse code */
            code?: (number|null);

            /** RefreshTokenResponse msg */
            msg?: (string|null);

            /** RefreshTokenResponse token */
            token?: (string|null);

            /** RefreshTokenResponse refreshToken */
            refreshToken?: (string|null);
        }

        /** Represents a RefreshTokenResponse. */
        class RefreshTokenResponse implements IRefreshTokenResponse {

            /**
             * Constructs a new RefreshTokenResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.IRefreshTokenResponse);

            /** RefreshTokenResponse code. */
            public code: number;

            /** RefreshTokenResponse msg. */
            public msg: string;

            /** RefreshTokenResponse token. */
            public token: string;

            /** RefreshTokenResponse refreshToken. */
            public refreshToken: string;

            /**
             * Creates a new RefreshTokenResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RefreshTokenResponse instance
             */
            public static create(properties?: xunxian.auth.IRefreshTokenResponse): xunxian.auth.RefreshTokenResponse;

            /**
             * Encodes the specified RefreshTokenResponse message. Does not implicitly {@link xunxian.auth.RefreshTokenResponse.verify|verify} messages.
             * @param message RefreshTokenResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.IRefreshTokenResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RefreshTokenResponse message, length delimited. Does not implicitly {@link xunxian.auth.RefreshTokenResponse.verify|verify} messages.
             * @param message RefreshTokenResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.IRefreshTokenResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RefreshTokenResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns RefreshTokenResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.RefreshTokenResponse;

            /**
             * Decodes a RefreshTokenResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RefreshTokenResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.RefreshTokenResponse;

            /**
             * Verifies a RefreshTokenResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a RefreshTokenResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns RefreshTokenResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.RefreshTokenResponse;

            /**
             * Creates a plain object from a RefreshTokenResponse message. Also converts values to other types if specified.
             * @param message RefreshTokenResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.RefreshTokenResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this RefreshTokenResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for RefreshTokenResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a CheckTokenRequest. */
        interface ICheckTokenRequest {

            /** CheckTokenRequest token */
            token?: (string|null);
        }

        /** Represents a CheckTokenRequest. */
        class CheckTokenRequest implements ICheckTokenRequest {

            /**
             * Constructs a new CheckTokenRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.ICheckTokenRequest);

            /** CheckTokenRequest token. */
            public token: string;

            /**
             * Creates a new CheckTokenRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CheckTokenRequest instance
             */
            public static create(properties?: xunxian.auth.ICheckTokenRequest): xunxian.auth.CheckTokenRequest;

            /**
             * Encodes the specified CheckTokenRequest message. Does not implicitly {@link xunxian.auth.CheckTokenRequest.verify|verify} messages.
             * @param message CheckTokenRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.ICheckTokenRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CheckTokenRequest message, length delimited. Does not implicitly {@link xunxian.auth.CheckTokenRequest.verify|verify} messages.
             * @param message CheckTokenRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.ICheckTokenRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CheckTokenRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CheckTokenRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.CheckTokenRequest;

            /**
             * Decodes a CheckTokenRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CheckTokenRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.CheckTokenRequest;

            /**
             * Verifies a CheckTokenRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a CheckTokenRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CheckTokenRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.CheckTokenRequest;

            /**
             * Creates a plain object from a CheckTokenRequest message. Also converts values to other types if specified.
             * @param message CheckTokenRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.CheckTokenRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this CheckTokenRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for CheckTokenRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a CheckTokenResponse. */
        interface ICheckTokenResponse {

            /** CheckTokenResponse code */
            code?: (number|null);

            /** CheckTokenResponse msg */
            msg?: (string|null);

            /** CheckTokenResponse accountId */
            accountId?: (number|Long|null);

            /** CheckTokenResponse hasCharacter */
            hasCharacter?: (boolean|null);

            /** CheckTokenResponse playerInfo */
            playerInfo?: (xunxian.auth.IPlayerBrief|null);
        }

        /** Represents a CheckTokenResponse. */
        class CheckTokenResponse implements ICheckTokenResponse {

            /**
             * Constructs a new CheckTokenResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.ICheckTokenResponse);

            /** CheckTokenResponse code. */
            public code: number;

            /** CheckTokenResponse msg. */
            public msg: string;

            /** CheckTokenResponse accountId. */
            public accountId: (number|Long);

            /** CheckTokenResponse hasCharacter. */
            public hasCharacter: boolean;

            /** CheckTokenResponse playerInfo. */
            public playerInfo?: (xunxian.auth.IPlayerBrief|null);

            /**
             * Creates a new CheckTokenResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CheckTokenResponse instance
             */
            public static create(properties?: xunxian.auth.ICheckTokenResponse): xunxian.auth.CheckTokenResponse;

            /**
             * Encodes the specified CheckTokenResponse message. Does not implicitly {@link xunxian.auth.CheckTokenResponse.verify|verify} messages.
             * @param message CheckTokenResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.ICheckTokenResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CheckTokenResponse message, length delimited. Does not implicitly {@link xunxian.auth.CheckTokenResponse.verify|verify} messages.
             * @param message CheckTokenResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.ICheckTokenResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CheckTokenResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CheckTokenResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.CheckTokenResponse;

            /**
             * Decodes a CheckTokenResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CheckTokenResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.CheckTokenResponse;

            /**
             * Verifies a CheckTokenResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a CheckTokenResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CheckTokenResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.CheckTokenResponse;

            /**
             * Creates a plain object from a CheckTokenResponse message. Also converts values to other types if specified.
             * @param message CheckTokenResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.CheckTokenResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this CheckTokenResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for CheckTokenResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a PlayerBrief. */
        interface IPlayerBrief {

            /** PlayerBrief playerId */
            playerId?: (number|Long|null);

            /** PlayerBrief name */
            name?: (string|null);

            /** PlayerBrief gender */
            gender?: (number|null);

            /** PlayerBrief levelStage */
            levelStage?: (number|null);

            /** PlayerBrief levelTier */
            levelTier?: (number|null);

            /** PlayerBrief levelStep */
            levelStep?: (number|null);

            /** PlayerBrief sceneId */
            sceneId?: (number|null);

            /** PlayerBrief posX */
            posX?: (number|null);

            /** PlayerBrief posY */
            posY?: (number|null);
        }

        /** Represents a PlayerBrief. */
        class PlayerBrief implements IPlayerBrief {

            /**
             * Constructs a new PlayerBrief.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.auth.IPlayerBrief);

            /** PlayerBrief playerId. */
            public playerId: (number|Long);

            /** PlayerBrief name. */
            public name: string;

            /** PlayerBrief gender. */
            public gender: number;

            /** PlayerBrief levelStage. */
            public levelStage: number;

            /** PlayerBrief levelTier. */
            public levelTier: number;

            /** PlayerBrief levelStep. */
            public levelStep: number;

            /** PlayerBrief sceneId. */
            public sceneId: number;

            /** PlayerBrief posX. */
            public posX: number;

            /** PlayerBrief posY. */
            public posY: number;

            /**
             * Creates a new PlayerBrief instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PlayerBrief instance
             */
            public static create(properties?: xunxian.auth.IPlayerBrief): xunxian.auth.PlayerBrief;

            /**
             * Encodes the specified PlayerBrief message. Does not implicitly {@link xunxian.auth.PlayerBrief.verify|verify} messages.
             * @param message PlayerBrief message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.auth.IPlayerBrief, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PlayerBrief message, length delimited. Does not implicitly {@link xunxian.auth.PlayerBrief.verify|verify} messages.
             * @param message PlayerBrief message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.auth.IPlayerBrief, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PlayerBrief message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns PlayerBrief
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.auth.PlayerBrief;

            /**
             * Decodes a PlayerBrief message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PlayerBrief
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.auth.PlayerBrief;

            /**
             * Verifies a PlayerBrief message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a PlayerBrief message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns PlayerBrief
             */
            public static fromObject(object: { [k: string]: any }): xunxian.auth.PlayerBrief;

            /**
             * Creates a plain object from a PlayerBrief message. Also converts values to other types if specified.
             * @param message PlayerBrief
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.auth.PlayerBrief, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this PlayerBrief to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for PlayerBrief
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Namespace player. */
    namespace player {

        /** Properties of a CreateCharacterRequest. */
        interface ICreateCharacterRequest {

            /** CreateCharacterRequest name */
            name?: (string|null);

            /** CreateCharacterRequest gender */
            gender?: (number|null);
        }

        /** Represents a CreateCharacterRequest. */
        class CreateCharacterRequest implements ICreateCharacterRequest {

            /**
             * Constructs a new CreateCharacterRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.player.ICreateCharacterRequest);

            /** CreateCharacterRequest name. */
            public name: string;

            /** CreateCharacterRequest gender. */
            public gender: number;

            /**
             * Creates a new CreateCharacterRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CreateCharacterRequest instance
             */
            public static create(properties?: xunxian.player.ICreateCharacterRequest): xunxian.player.CreateCharacterRequest;

            /**
             * Encodes the specified CreateCharacterRequest message. Does not implicitly {@link xunxian.player.CreateCharacterRequest.verify|verify} messages.
             * @param message CreateCharacterRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.player.ICreateCharacterRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CreateCharacterRequest message, length delimited. Does not implicitly {@link xunxian.player.CreateCharacterRequest.verify|verify} messages.
             * @param message CreateCharacterRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.player.ICreateCharacterRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CreateCharacterRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CreateCharacterRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.player.CreateCharacterRequest;

            /**
             * Decodes a CreateCharacterRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CreateCharacterRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.player.CreateCharacterRequest;

            /**
             * Verifies a CreateCharacterRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a CreateCharacterRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CreateCharacterRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.player.CreateCharacterRequest;

            /**
             * Creates a plain object from a CreateCharacterRequest message. Also converts values to other types if specified.
             * @param message CreateCharacterRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.player.CreateCharacterRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this CreateCharacterRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for CreateCharacterRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a CreateCharacterResponse. */
        interface ICreateCharacterResponse {

            /** CreateCharacterResponse code */
            code?: (number|null);

            /** CreateCharacterResponse msg */
            msg?: (string|null);

            /** CreateCharacterResponse playerId */
            playerId?: (number|Long|null);

            /** CreateCharacterResponse name */
            name?: (string|null);

            /** CreateCharacterResponse gender */
            gender?: (number|null);

            /** CreateCharacterResponse attrs */
            attrs?: (xunxian.player.IPlayerAttrs|null);

            /** CreateCharacterResponse sceneId */
            sceneId?: (number|null);

            /** CreateCharacterResponse posX */
            posX?: (number|null);

            /** CreateCharacterResponse posY */
            posY?: (number|null);
        }

        /** Represents a CreateCharacterResponse. */
        class CreateCharacterResponse implements ICreateCharacterResponse {

            /**
             * Constructs a new CreateCharacterResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.player.ICreateCharacterResponse);

            /** CreateCharacterResponse code. */
            public code: number;

            /** CreateCharacterResponse msg. */
            public msg: string;

            /** CreateCharacterResponse playerId. */
            public playerId: (number|Long);

            /** CreateCharacterResponse name. */
            public name: string;

            /** CreateCharacterResponse gender. */
            public gender: number;

            /** CreateCharacterResponse attrs. */
            public attrs?: (xunxian.player.IPlayerAttrs|null);

            /** CreateCharacterResponse sceneId. */
            public sceneId: number;

            /** CreateCharacterResponse posX. */
            public posX: number;

            /** CreateCharacterResponse posY. */
            public posY: number;

            /**
             * Creates a new CreateCharacterResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns CreateCharacterResponse instance
             */
            public static create(properties?: xunxian.player.ICreateCharacterResponse): xunxian.player.CreateCharacterResponse;

            /**
             * Encodes the specified CreateCharacterResponse message. Does not implicitly {@link xunxian.player.CreateCharacterResponse.verify|verify} messages.
             * @param message CreateCharacterResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.player.ICreateCharacterResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified CreateCharacterResponse message, length delimited. Does not implicitly {@link xunxian.player.CreateCharacterResponse.verify|verify} messages.
             * @param message CreateCharacterResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.player.ICreateCharacterResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a CreateCharacterResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CreateCharacterResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.player.CreateCharacterResponse;

            /**
             * Decodes a CreateCharacterResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns CreateCharacterResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.player.CreateCharacterResponse;

            /**
             * Verifies a CreateCharacterResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a CreateCharacterResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns CreateCharacterResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.player.CreateCharacterResponse;

            /**
             * Creates a plain object from a CreateCharacterResponse message. Also converts values to other types if specified.
             * @param message CreateCharacterResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.player.CreateCharacterResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this CreateCharacterResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for CreateCharacterResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a GetPlayerRequest. */
        interface IGetPlayerRequest {

            /** GetPlayerRequest playerId */
            playerId?: (number|Long|null);
        }

        /** Represents a GetPlayerRequest. */
        class GetPlayerRequest implements IGetPlayerRequest {

            /**
             * Constructs a new GetPlayerRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.player.IGetPlayerRequest);

            /** GetPlayerRequest playerId. */
            public playerId: (number|Long);

            /**
             * Creates a new GetPlayerRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetPlayerRequest instance
             */
            public static create(properties?: xunxian.player.IGetPlayerRequest): xunxian.player.GetPlayerRequest;

            /**
             * Encodes the specified GetPlayerRequest message. Does not implicitly {@link xunxian.player.GetPlayerRequest.verify|verify} messages.
             * @param message GetPlayerRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.player.IGetPlayerRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetPlayerRequest message, length delimited. Does not implicitly {@link xunxian.player.GetPlayerRequest.verify|verify} messages.
             * @param message GetPlayerRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.player.IGetPlayerRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetPlayerRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns GetPlayerRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.player.GetPlayerRequest;

            /**
             * Decodes a GetPlayerRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetPlayerRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.player.GetPlayerRequest;

            /**
             * Verifies a GetPlayerRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a GetPlayerRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns GetPlayerRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.player.GetPlayerRequest;

            /**
             * Creates a plain object from a GetPlayerRequest message. Also converts values to other types if specified.
             * @param message GetPlayerRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.player.GetPlayerRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this GetPlayerRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for GetPlayerRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a GetPlayerResponse. */
        interface IGetPlayerResponse {

            /** GetPlayerResponse code */
            code?: (number|null);

            /** GetPlayerResponse msg */
            msg?: (string|null);

            /** GetPlayerResponse info */
            info?: (xunxian.player.IPlayerInfo|null);
        }

        /** Represents a GetPlayerResponse. */
        class GetPlayerResponse implements IGetPlayerResponse {

            /**
             * Constructs a new GetPlayerResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.player.IGetPlayerResponse);

            /** GetPlayerResponse code. */
            public code: number;

            /** GetPlayerResponse msg. */
            public msg: string;

            /** GetPlayerResponse info. */
            public info?: (xunxian.player.IPlayerInfo|null);

            /**
             * Creates a new GetPlayerResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetPlayerResponse instance
             */
            public static create(properties?: xunxian.player.IGetPlayerResponse): xunxian.player.GetPlayerResponse;

            /**
             * Encodes the specified GetPlayerResponse message. Does not implicitly {@link xunxian.player.GetPlayerResponse.verify|verify} messages.
             * @param message GetPlayerResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.player.IGetPlayerResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetPlayerResponse message, length delimited. Does not implicitly {@link xunxian.player.GetPlayerResponse.verify|verify} messages.
             * @param message GetPlayerResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.player.IGetPlayerResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetPlayerResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns GetPlayerResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.player.GetPlayerResponse;

            /**
             * Decodes a GetPlayerResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetPlayerResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.player.GetPlayerResponse;

            /**
             * Verifies a GetPlayerResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a GetPlayerResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns GetPlayerResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.player.GetPlayerResponse;

            /**
             * Creates a plain object from a GetPlayerResponse message. Also converts values to other types if specified.
             * @param message GetPlayerResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.player.GetPlayerResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this GetPlayerResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for GetPlayerResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a GetPlayerAttrRequest. */
        interface IGetPlayerAttrRequest {

            /** GetPlayerAttrRequest playerId */
            playerId?: (number|Long|null);
        }

        /** Represents a GetPlayerAttrRequest. */
        class GetPlayerAttrRequest implements IGetPlayerAttrRequest {

            /**
             * Constructs a new GetPlayerAttrRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.player.IGetPlayerAttrRequest);

            /** GetPlayerAttrRequest playerId. */
            public playerId: (number|Long);

            /**
             * Creates a new GetPlayerAttrRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetPlayerAttrRequest instance
             */
            public static create(properties?: xunxian.player.IGetPlayerAttrRequest): xunxian.player.GetPlayerAttrRequest;

            /**
             * Encodes the specified GetPlayerAttrRequest message. Does not implicitly {@link xunxian.player.GetPlayerAttrRequest.verify|verify} messages.
             * @param message GetPlayerAttrRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.player.IGetPlayerAttrRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetPlayerAttrRequest message, length delimited. Does not implicitly {@link xunxian.player.GetPlayerAttrRequest.verify|verify} messages.
             * @param message GetPlayerAttrRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.player.IGetPlayerAttrRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetPlayerAttrRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns GetPlayerAttrRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.player.GetPlayerAttrRequest;

            /**
             * Decodes a GetPlayerAttrRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetPlayerAttrRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.player.GetPlayerAttrRequest;

            /**
             * Verifies a GetPlayerAttrRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a GetPlayerAttrRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns GetPlayerAttrRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.player.GetPlayerAttrRequest;

            /**
             * Creates a plain object from a GetPlayerAttrRequest message. Also converts values to other types if specified.
             * @param message GetPlayerAttrRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.player.GetPlayerAttrRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this GetPlayerAttrRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for GetPlayerAttrRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a GetPlayerAttrResponse. */
        interface IGetPlayerAttrResponse {

            /** GetPlayerAttrResponse code */
            code?: (number|null);

            /** GetPlayerAttrResponse msg */
            msg?: (string|null);

            /** GetPlayerAttrResponse attrs */
            attrs?: (xunxian.player.IPlayerAttrs|null);

            /** GetPlayerAttrResponse hiddenAttrs */
            hiddenAttrs?: (xunxian.player.IHiddenAttrs|null);
        }

        /** Represents a GetPlayerAttrResponse. */
        class GetPlayerAttrResponse implements IGetPlayerAttrResponse {

            /**
             * Constructs a new GetPlayerAttrResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.player.IGetPlayerAttrResponse);

            /** GetPlayerAttrResponse code. */
            public code: number;

            /** GetPlayerAttrResponse msg. */
            public msg: string;

            /** GetPlayerAttrResponse attrs. */
            public attrs?: (xunxian.player.IPlayerAttrs|null);

            /** GetPlayerAttrResponse hiddenAttrs. */
            public hiddenAttrs?: (xunxian.player.IHiddenAttrs|null);

            /**
             * Creates a new GetPlayerAttrResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns GetPlayerAttrResponse instance
             */
            public static create(properties?: xunxian.player.IGetPlayerAttrResponse): xunxian.player.GetPlayerAttrResponse;

            /**
             * Encodes the specified GetPlayerAttrResponse message. Does not implicitly {@link xunxian.player.GetPlayerAttrResponse.verify|verify} messages.
             * @param message GetPlayerAttrResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.player.IGetPlayerAttrResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified GetPlayerAttrResponse message, length delimited. Does not implicitly {@link xunxian.player.GetPlayerAttrResponse.verify|verify} messages.
             * @param message GetPlayerAttrResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.player.IGetPlayerAttrResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a GetPlayerAttrResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns GetPlayerAttrResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.player.GetPlayerAttrResponse;

            /**
             * Decodes a GetPlayerAttrResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns GetPlayerAttrResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.player.GetPlayerAttrResponse;

            /**
             * Verifies a GetPlayerAttrResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a GetPlayerAttrResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns GetPlayerAttrResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.player.GetPlayerAttrResponse;

            /**
             * Creates a plain object from a GetPlayerAttrResponse message. Also converts values to other types if specified.
             * @param message GetPlayerAttrResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.player.GetPlayerAttrResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this GetPlayerAttrResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for GetPlayerAttrResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a RandomNameRequest. */
        interface IRandomNameRequest {

            /** RandomNameRequest gender */
            gender?: (number|null);
        }

        /** Represents a RandomNameRequest. */
        class RandomNameRequest implements IRandomNameRequest {

            /**
             * Constructs a new RandomNameRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.player.IRandomNameRequest);

            /** RandomNameRequest gender. */
            public gender: number;

            /**
             * Creates a new RandomNameRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RandomNameRequest instance
             */
            public static create(properties?: xunxian.player.IRandomNameRequest): xunxian.player.RandomNameRequest;

            /**
             * Encodes the specified RandomNameRequest message. Does not implicitly {@link xunxian.player.RandomNameRequest.verify|verify} messages.
             * @param message RandomNameRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.player.IRandomNameRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RandomNameRequest message, length delimited. Does not implicitly {@link xunxian.player.RandomNameRequest.verify|verify} messages.
             * @param message RandomNameRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.player.IRandomNameRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RandomNameRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns RandomNameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.player.RandomNameRequest;

            /**
             * Decodes a RandomNameRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RandomNameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.player.RandomNameRequest;

            /**
             * Verifies a RandomNameRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a RandomNameRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns RandomNameRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.player.RandomNameRequest;

            /**
             * Creates a plain object from a RandomNameRequest message. Also converts values to other types if specified.
             * @param message RandomNameRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.player.RandomNameRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this RandomNameRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for RandomNameRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a RandomNameResponse. */
        interface IRandomNameResponse {

            /** RandomNameResponse code */
            code?: (number|null);

            /** RandomNameResponse msg */
            msg?: (string|null);

            /** RandomNameResponse name */
            name?: (string|null);
        }

        /** Represents a RandomNameResponse. */
        class RandomNameResponse implements IRandomNameResponse {

            /**
             * Constructs a new RandomNameResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.player.IRandomNameResponse);

            /** RandomNameResponse code. */
            public code: number;

            /** RandomNameResponse msg. */
            public msg: string;

            /** RandomNameResponse name. */
            public name: string;

            /**
             * Creates a new RandomNameResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns RandomNameResponse instance
             */
            public static create(properties?: xunxian.player.IRandomNameResponse): xunxian.player.RandomNameResponse;

            /**
             * Encodes the specified RandomNameResponse message. Does not implicitly {@link xunxian.player.RandomNameResponse.verify|verify} messages.
             * @param message RandomNameResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.player.IRandomNameResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified RandomNameResponse message, length delimited. Does not implicitly {@link xunxian.player.RandomNameResponse.verify|verify} messages.
             * @param message RandomNameResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.player.IRandomNameResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a RandomNameResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns RandomNameResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.player.RandomNameResponse;

            /**
             * Decodes a RandomNameResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns RandomNameResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.player.RandomNameResponse;

            /**
             * Verifies a RandomNameResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a RandomNameResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns RandomNameResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.player.RandomNameResponse;

            /**
             * Creates a plain object from a RandomNameResponse message. Also converts values to other types if specified.
             * @param message RandomNameResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.player.RandomNameResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this RandomNameResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for RandomNameResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a ValidateNameRequest. */
        interface IValidateNameRequest {

            /** ValidateNameRequest name */
            name?: (string|null);
        }

        /** Represents a ValidateNameRequest. */
        class ValidateNameRequest implements IValidateNameRequest {

            /**
             * Constructs a new ValidateNameRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.player.IValidateNameRequest);

            /** ValidateNameRequest name. */
            public name: string;

            /**
             * Creates a new ValidateNameRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ValidateNameRequest instance
             */
            public static create(properties?: xunxian.player.IValidateNameRequest): xunxian.player.ValidateNameRequest;

            /**
             * Encodes the specified ValidateNameRequest message. Does not implicitly {@link xunxian.player.ValidateNameRequest.verify|verify} messages.
             * @param message ValidateNameRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.player.IValidateNameRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ValidateNameRequest message, length delimited. Does not implicitly {@link xunxian.player.ValidateNameRequest.verify|verify} messages.
             * @param message ValidateNameRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.player.IValidateNameRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ValidateNameRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ValidateNameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.player.ValidateNameRequest;

            /**
             * Decodes a ValidateNameRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ValidateNameRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.player.ValidateNameRequest;

            /**
             * Verifies a ValidateNameRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ValidateNameRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ValidateNameRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.player.ValidateNameRequest;

            /**
             * Creates a plain object from a ValidateNameRequest message. Also converts values to other types if specified.
             * @param message ValidateNameRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.player.ValidateNameRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ValidateNameRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ValidateNameRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a ValidateNameResponse. */
        interface IValidateNameResponse {

            /** ValidateNameResponse code */
            code?: (number|null);

            /** ValidateNameResponse msg */
            msg?: (string|null);

            /** ValidateNameResponse valid */
            valid?: (boolean|null);
        }

        /** Represents a ValidateNameResponse. */
        class ValidateNameResponse implements IValidateNameResponse {

            /**
             * Constructs a new ValidateNameResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.player.IValidateNameResponse);

            /** ValidateNameResponse code. */
            public code: number;

            /** ValidateNameResponse msg. */
            public msg: string;

            /** ValidateNameResponse valid. */
            public valid: boolean;

            /**
             * Creates a new ValidateNameResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ValidateNameResponse instance
             */
            public static create(properties?: xunxian.player.IValidateNameResponse): xunxian.player.ValidateNameResponse;

            /**
             * Encodes the specified ValidateNameResponse message. Does not implicitly {@link xunxian.player.ValidateNameResponse.verify|verify} messages.
             * @param message ValidateNameResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.player.IValidateNameResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ValidateNameResponse message, length delimited. Does not implicitly {@link xunxian.player.ValidateNameResponse.verify|verify} messages.
             * @param message ValidateNameResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.player.IValidateNameResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ValidateNameResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ValidateNameResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.player.ValidateNameResponse;

            /**
             * Decodes a ValidateNameResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ValidateNameResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.player.ValidateNameResponse;

            /**
             * Verifies a ValidateNameResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ValidateNameResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ValidateNameResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.player.ValidateNameResponse;

            /**
             * Creates a plain object from a ValidateNameResponse message. Also converts values to other types if specified.
             * @param message ValidateNameResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.player.ValidateNameResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ValidateNameResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ValidateNameResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a PlayerInfo. */
        interface IPlayerInfo {

            /** PlayerInfo playerId */
            playerId?: (number|Long|null);

            /** PlayerInfo accountId */
            accountId?: (number|Long|null);

            /** PlayerInfo name */
            name?: (string|null);

            /** PlayerInfo gender */
            gender?: (number|null);

            /** PlayerInfo race */
            race?: (number|null);

            /** PlayerInfo levelStage */
            levelStage?: (number|null);

            /** PlayerInfo levelTier */
            levelTier?: (number|null);

            /** PlayerInfo levelStep */
            levelStep?: (number|null);

            /** PlayerInfo sceneId */
            sceneId?: (number|null);

            /** PlayerInfo posX */
            posX?: (number|null);

            /** PlayerInfo posY */
            posY?: (number|null);

            /** PlayerInfo attrs */
            attrs?: (xunxian.player.IPlayerAttrs|null);

            /** PlayerInfo hiddenAttrs */
            hiddenAttrs?: (xunxian.player.IHiddenAttrs|null);

            /** PlayerInfo status */
            status?: (string|null);
        }

        /** Represents a PlayerInfo. */
        class PlayerInfo implements IPlayerInfo {

            /**
             * Constructs a new PlayerInfo.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.player.IPlayerInfo);

            /** PlayerInfo playerId. */
            public playerId: (number|Long);

            /** PlayerInfo accountId. */
            public accountId: (number|Long);

            /** PlayerInfo name. */
            public name: string;

            /** PlayerInfo gender. */
            public gender: number;

            /** PlayerInfo race. */
            public race: number;

            /** PlayerInfo levelStage. */
            public levelStage: number;

            /** PlayerInfo levelTier. */
            public levelTier: number;

            /** PlayerInfo levelStep. */
            public levelStep: number;

            /** PlayerInfo sceneId. */
            public sceneId: number;

            /** PlayerInfo posX. */
            public posX: number;

            /** PlayerInfo posY. */
            public posY: number;

            /** PlayerInfo attrs. */
            public attrs?: (xunxian.player.IPlayerAttrs|null);

            /** PlayerInfo hiddenAttrs. */
            public hiddenAttrs?: (xunxian.player.IHiddenAttrs|null);

            /** PlayerInfo status. */
            public status: string;

            /**
             * Creates a new PlayerInfo instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PlayerInfo instance
             */
            public static create(properties?: xunxian.player.IPlayerInfo): xunxian.player.PlayerInfo;

            /**
             * Encodes the specified PlayerInfo message. Does not implicitly {@link xunxian.player.PlayerInfo.verify|verify} messages.
             * @param message PlayerInfo message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.player.IPlayerInfo, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PlayerInfo message, length delimited. Does not implicitly {@link xunxian.player.PlayerInfo.verify|verify} messages.
             * @param message PlayerInfo message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.player.IPlayerInfo, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PlayerInfo message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns PlayerInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.player.PlayerInfo;

            /**
             * Decodes a PlayerInfo message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PlayerInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.player.PlayerInfo;

            /**
             * Verifies a PlayerInfo message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a PlayerInfo message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns PlayerInfo
             */
            public static fromObject(object: { [k: string]: any }): xunxian.player.PlayerInfo;

            /**
             * Creates a plain object from a PlayerInfo message. Also converts values to other types if specified.
             * @param message PlayerInfo
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.player.PlayerInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this PlayerInfo to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for PlayerInfo
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a PlayerAttrs. */
        interface IPlayerAttrs {

            /** PlayerAttrs jing */
            jing?: (number|null);

            /** PlayerAttrs qiMetal */
            qiMetal?: (number|null);

            /** PlayerAttrs qiWood */
            qiWood?: (number|null);

            /** PlayerAttrs qiWater */
            qiWater?: (number|null);

            /** PlayerAttrs qiFire */
            qiFire?: (number|null);

            /** PlayerAttrs qiEarth */
            qiEarth?: (number|null);

            /** PlayerAttrs shen */
            shen?: (number|null);

            /** PlayerAttrs luck */
            luck?: (number|null);

            /** PlayerAttrs savvy */
            savvy?: (number|null);
        }

        /** Represents a PlayerAttrs. */
        class PlayerAttrs implements IPlayerAttrs {

            /**
             * Constructs a new PlayerAttrs.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.player.IPlayerAttrs);

            /** PlayerAttrs jing. */
            public jing: number;

            /** PlayerAttrs qiMetal. */
            public qiMetal: number;

            /** PlayerAttrs qiWood. */
            public qiWood: number;

            /** PlayerAttrs qiWater. */
            public qiWater: number;

            /** PlayerAttrs qiFire. */
            public qiFire: number;

            /** PlayerAttrs qiEarth. */
            public qiEarth: number;

            /** PlayerAttrs shen. */
            public shen: number;

            /** PlayerAttrs luck. */
            public luck: number;

            /** PlayerAttrs savvy. */
            public savvy: number;

            /**
             * Creates a new PlayerAttrs instance using the specified properties.
             * @param [properties] Properties to set
             * @returns PlayerAttrs instance
             */
            public static create(properties?: xunxian.player.IPlayerAttrs): xunxian.player.PlayerAttrs;

            /**
             * Encodes the specified PlayerAttrs message. Does not implicitly {@link xunxian.player.PlayerAttrs.verify|verify} messages.
             * @param message PlayerAttrs message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.player.IPlayerAttrs, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PlayerAttrs message, length delimited. Does not implicitly {@link xunxian.player.PlayerAttrs.verify|verify} messages.
             * @param message PlayerAttrs message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.player.IPlayerAttrs, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a PlayerAttrs message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns PlayerAttrs
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.player.PlayerAttrs;

            /**
             * Decodes a PlayerAttrs message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns PlayerAttrs
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.player.PlayerAttrs;

            /**
             * Verifies a PlayerAttrs message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a PlayerAttrs message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns PlayerAttrs
             */
            public static fromObject(object: { [k: string]: any }): xunxian.player.PlayerAttrs;

            /**
             * Creates a plain object from a PlayerAttrs message. Also converts values to other types if specified.
             * @param message PlayerAttrs
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.player.PlayerAttrs, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this PlayerAttrs to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for PlayerAttrs
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a HiddenAttrs. */
        interface IHiddenAttrs {

            /** HiddenAttrs causality */
            causality?: (number|null);

            /** HiddenAttrs innerDemon */
            innerDemon?: (number|null);

            /** HiddenAttrs daoAge */
            daoAge?: (number|null);

            /** HiddenAttrs tribulationCount */
            tribulationCount?: (number|null);
        }

        /** Represents a HiddenAttrs. */
        class HiddenAttrs implements IHiddenAttrs {

            /**
             * Constructs a new HiddenAttrs.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.player.IHiddenAttrs);

            /** HiddenAttrs causality. */
            public causality: number;

            /** HiddenAttrs innerDemon. */
            public innerDemon: number;

            /** HiddenAttrs daoAge. */
            public daoAge: number;

            /** HiddenAttrs tribulationCount. */
            public tribulationCount: number;

            /**
             * Creates a new HiddenAttrs instance using the specified properties.
             * @param [properties] Properties to set
             * @returns HiddenAttrs instance
             */
            public static create(properties?: xunxian.player.IHiddenAttrs): xunxian.player.HiddenAttrs;

            /**
             * Encodes the specified HiddenAttrs message. Does not implicitly {@link xunxian.player.HiddenAttrs.verify|verify} messages.
             * @param message HiddenAttrs message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.player.IHiddenAttrs, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified HiddenAttrs message, length delimited. Does not implicitly {@link xunxian.player.HiddenAttrs.verify|verify} messages.
             * @param message HiddenAttrs message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.player.IHiddenAttrs, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a HiddenAttrs message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns HiddenAttrs
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.player.HiddenAttrs;

            /**
             * Decodes a HiddenAttrs message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns HiddenAttrs
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.player.HiddenAttrs;

            /**
             * Verifies a HiddenAttrs message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a HiddenAttrs message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns HiddenAttrs
             */
            public static fromObject(object: { [k: string]: any }): xunxian.player.HiddenAttrs;

            /**
             * Creates a plain object from a HiddenAttrs message. Also converts values to other types if specified.
             * @param message HiddenAttrs
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.player.HiddenAttrs, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this HiddenAttrs to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for HiddenAttrs
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }

    /** Namespace scene. */
    namespace scene {

        /** Properties of an EnterSceneRequest. */
        interface IEnterSceneRequest {

            /** EnterSceneRequest playerId */
            playerId?: (number|Long|null);

            /** EnterSceneRequest sceneId */
            sceneId?: (number|null);
        }

        /** Represents an EnterSceneRequest. */
        class EnterSceneRequest implements IEnterSceneRequest {

            /**
             * Constructs a new EnterSceneRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IEnterSceneRequest);

            /** EnterSceneRequest playerId. */
            public playerId: (number|Long);

            /** EnterSceneRequest sceneId. */
            public sceneId: number;

            /**
             * Creates a new EnterSceneRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns EnterSceneRequest instance
             */
            public static create(properties?: xunxian.scene.IEnterSceneRequest): xunxian.scene.EnterSceneRequest;

            /**
             * Encodes the specified EnterSceneRequest message. Does not implicitly {@link xunxian.scene.EnterSceneRequest.verify|verify} messages.
             * @param message EnterSceneRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IEnterSceneRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EnterSceneRequest message, length delimited. Does not implicitly {@link xunxian.scene.EnterSceneRequest.verify|verify} messages.
             * @param message EnterSceneRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IEnterSceneRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an EnterSceneRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns EnterSceneRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.EnterSceneRequest;

            /**
             * Decodes an EnterSceneRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns EnterSceneRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.EnterSceneRequest;

            /**
             * Verifies an EnterSceneRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an EnterSceneRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns EnterSceneRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.EnterSceneRequest;

            /**
             * Creates a plain object from an EnterSceneRequest message. Also converts values to other types if specified.
             * @param message EnterSceneRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.EnterSceneRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this EnterSceneRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for EnterSceneRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of an EnterSceneResponse. */
        interface IEnterSceneResponse {

            /** EnterSceneResponse code */
            code?: (number|null);

            /** EnterSceneResponse msg */
            msg?: (string|null);

            /** EnterSceneResponse entities */
            entities?: (xunxian.scene.IEntityState[]|null);

            /** EnterSceneResponse posX */
            posX?: (number|null);

            /** EnterSceneResponse posY */
            posY?: (number|null);
        }

        /** Represents an EnterSceneResponse. */
        class EnterSceneResponse implements IEnterSceneResponse {

            /**
             * Constructs a new EnterSceneResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IEnterSceneResponse);

            /** EnterSceneResponse code. */
            public code: number;

            /** EnterSceneResponse msg. */
            public msg: string;

            /** EnterSceneResponse entities. */
            public entities: xunxian.scene.IEntityState[];

            /** EnterSceneResponse posX. */
            public posX: number;

            /** EnterSceneResponse posY. */
            public posY: number;

            /**
             * Creates a new EnterSceneResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns EnterSceneResponse instance
             */
            public static create(properties?: xunxian.scene.IEnterSceneResponse): xunxian.scene.EnterSceneResponse;

            /**
             * Encodes the specified EnterSceneResponse message. Does not implicitly {@link xunxian.scene.EnterSceneResponse.verify|verify} messages.
             * @param message EnterSceneResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IEnterSceneResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EnterSceneResponse message, length delimited. Does not implicitly {@link xunxian.scene.EnterSceneResponse.verify|verify} messages.
             * @param message EnterSceneResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IEnterSceneResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an EnterSceneResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns EnterSceneResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.EnterSceneResponse;

            /**
             * Decodes an EnterSceneResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns EnterSceneResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.EnterSceneResponse;

            /**
             * Verifies an EnterSceneResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an EnterSceneResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns EnterSceneResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.EnterSceneResponse;

            /**
             * Creates a plain object from an EnterSceneResponse message. Also converts values to other types if specified.
             * @param message EnterSceneResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.EnterSceneResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this EnterSceneResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for EnterSceneResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a LeaveSceneRequest. */
        interface ILeaveSceneRequest {

            /** LeaveSceneRequest playerId */
            playerId?: (number|Long|null);

            /** LeaveSceneRequest sceneId */
            sceneId?: (number|null);
        }

        /** Represents a LeaveSceneRequest. */
        class LeaveSceneRequest implements ILeaveSceneRequest {

            /**
             * Constructs a new LeaveSceneRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.ILeaveSceneRequest);

            /** LeaveSceneRequest playerId. */
            public playerId: (number|Long);

            /** LeaveSceneRequest sceneId. */
            public sceneId: number;

            /**
             * Creates a new LeaveSceneRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns LeaveSceneRequest instance
             */
            public static create(properties?: xunxian.scene.ILeaveSceneRequest): xunxian.scene.LeaveSceneRequest;

            /**
             * Encodes the specified LeaveSceneRequest message. Does not implicitly {@link xunxian.scene.LeaveSceneRequest.verify|verify} messages.
             * @param message LeaveSceneRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.ILeaveSceneRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified LeaveSceneRequest message, length delimited. Does not implicitly {@link xunxian.scene.LeaveSceneRequest.verify|verify} messages.
             * @param message LeaveSceneRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.ILeaveSceneRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a LeaveSceneRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns LeaveSceneRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.LeaveSceneRequest;

            /**
             * Decodes a LeaveSceneRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns LeaveSceneRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.LeaveSceneRequest;

            /**
             * Verifies a LeaveSceneRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a LeaveSceneRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns LeaveSceneRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.LeaveSceneRequest;

            /**
             * Creates a plain object from a LeaveSceneRequest message. Also converts values to other types if specified.
             * @param message LeaveSceneRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.LeaveSceneRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this LeaveSceneRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for LeaveSceneRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a LeaveSceneResponse. */
        interface ILeaveSceneResponse {

            /** LeaveSceneResponse code */
            code?: (number|null);

            /** LeaveSceneResponse msg */
            msg?: (string|null);
        }

        /** Represents a LeaveSceneResponse. */
        class LeaveSceneResponse implements ILeaveSceneResponse {

            /**
             * Constructs a new LeaveSceneResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.ILeaveSceneResponse);

            /** LeaveSceneResponse code. */
            public code: number;

            /** LeaveSceneResponse msg. */
            public msg: string;

            /**
             * Creates a new LeaveSceneResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns LeaveSceneResponse instance
             */
            public static create(properties?: xunxian.scene.ILeaveSceneResponse): xunxian.scene.LeaveSceneResponse;

            /**
             * Encodes the specified LeaveSceneResponse message. Does not implicitly {@link xunxian.scene.LeaveSceneResponse.verify|verify} messages.
             * @param message LeaveSceneResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.ILeaveSceneResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified LeaveSceneResponse message, length delimited. Does not implicitly {@link xunxian.scene.LeaveSceneResponse.verify|verify} messages.
             * @param message LeaveSceneResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.ILeaveSceneResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a LeaveSceneResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns LeaveSceneResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.LeaveSceneResponse;

            /**
             * Decodes a LeaveSceneResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns LeaveSceneResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.LeaveSceneResponse;

            /**
             * Verifies a LeaveSceneResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a LeaveSceneResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns LeaveSceneResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.LeaveSceneResponse;

            /**
             * Creates a plain object from a LeaveSceneResponse message. Also converts values to other types if specified.
             * @param message LeaveSceneResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.LeaveSceneResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this LeaveSceneResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for LeaveSceneResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a MoveRequest. */
        interface IMoveRequest {

            /** MoveRequest x */
            x?: (number|null);

            /** MoveRequest y */
            y?: (number|null);

            /** MoveRequest seq */
            seq?: (number|null);

            /** MoveRequest dir */
            dir?: (number|null);
        }

        /** Represents a MoveRequest. */
        class MoveRequest implements IMoveRequest {

            /**
             * Constructs a new MoveRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IMoveRequest);

            /** MoveRequest x. */
            public x: number;

            /** MoveRequest y. */
            public y: number;

            /** MoveRequest seq. */
            public seq: number;

            /** MoveRequest dir. */
            public dir: number;

            /**
             * Creates a new MoveRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns MoveRequest instance
             */
            public static create(properties?: xunxian.scene.IMoveRequest): xunxian.scene.MoveRequest;

            /**
             * Encodes the specified MoveRequest message. Does not implicitly {@link xunxian.scene.MoveRequest.verify|verify} messages.
             * @param message MoveRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IMoveRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified MoveRequest message, length delimited. Does not implicitly {@link xunxian.scene.MoveRequest.verify|verify} messages.
             * @param message MoveRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IMoveRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a MoveRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns MoveRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.MoveRequest;

            /**
             * Decodes a MoveRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns MoveRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.MoveRequest;

            /**
             * Verifies a MoveRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a MoveRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns MoveRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.MoveRequest;

            /**
             * Creates a plain object from a MoveRequest message. Also converts values to other types if specified.
             * @param message MoveRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.MoveRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this MoveRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for MoveRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a SyncFrame. */
        interface ISyncFrame {

            /** SyncFrame entities */
            entities?: (xunxian.scene.IEntityState[]|null);

            /** SyncFrame serverSeq */
            serverSeq?: (number|null);
        }

        /** Represents a SyncFrame. */
        class SyncFrame implements ISyncFrame {

            /**
             * Constructs a new SyncFrame.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.ISyncFrame);

            /** SyncFrame entities. */
            public entities: xunxian.scene.IEntityState[];

            /** SyncFrame serverSeq. */
            public serverSeq: number;

            /**
             * Creates a new SyncFrame instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SyncFrame instance
             */
            public static create(properties?: xunxian.scene.ISyncFrame): xunxian.scene.SyncFrame;

            /**
             * Encodes the specified SyncFrame message. Does not implicitly {@link xunxian.scene.SyncFrame.verify|verify} messages.
             * @param message SyncFrame message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.ISyncFrame, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SyncFrame message, length delimited. Does not implicitly {@link xunxian.scene.SyncFrame.verify|verify} messages.
             * @param message SyncFrame message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.ISyncFrame, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SyncFrame message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SyncFrame
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.SyncFrame;

            /**
             * Decodes a SyncFrame message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SyncFrame
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.SyncFrame;

            /**
             * Verifies a SyncFrame message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SyncFrame message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SyncFrame
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.SyncFrame;

            /**
             * Creates a plain object from a SyncFrame message. Also converts values to other types if specified.
             * @param message SyncFrame
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.SyncFrame, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SyncFrame to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SyncFrame
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of an EntityState. */
        interface IEntityState {

            /** EntityState entityId */
            entityId?: (number|Long|null);

            /** EntityState x */
            x?: (number|null);

            /** EntityState y */
            y?: (number|null);

            /** EntityState dir */
            dir?: (number|null);

            /** EntityState action */
            action?: (number|null);

            /** EntityState name */
            name?: (string|null);

            /** EntityState entityType */
            entityType?: (number|null);

            /** EntityState gender */
            gender?: (number|null);

            /** EntityState levelStage */
            levelStage?: (number|null);

            /** EntityState levelTier */
            levelTier?: (number|null);
        }

        /** Represents an EntityState. */
        class EntityState implements IEntityState {

            /**
             * Constructs a new EntityState.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IEntityState);

            /** EntityState entityId. */
            public entityId: (number|Long);

            /** EntityState x. */
            public x: number;

            /** EntityState y. */
            public y: number;

            /** EntityState dir. */
            public dir: number;

            /** EntityState action. */
            public action: number;

            /** EntityState name. */
            public name: string;

            /** EntityState entityType. */
            public entityType: number;

            /** EntityState gender. */
            public gender: number;

            /** EntityState levelStage. */
            public levelStage: number;

            /** EntityState levelTier. */
            public levelTier: number;

            /**
             * Creates a new EntityState instance using the specified properties.
             * @param [properties] Properties to set
             * @returns EntityState instance
             */
            public static create(properties?: xunxian.scene.IEntityState): xunxian.scene.EntityState;

            /**
             * Encodes the specified EntityState message. Does not implicitly {@link xunxian.scene.EntityState.verify|verify} messages.
             * @param message EntityState message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IEntityState, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EntityState message, length delimited. Does not implicitly {@link xunxian.scene.EntityState.verify|verify} messages.
             * @param message EntityState message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IEntityState, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an EntityState message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns EntityState
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.EntityState;

            /**
             * Decodes an EntityState message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns EntityState
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.EntityState;

            /**
             * Verifies an EntityState message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an EntityState message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns EntityState
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.EntityState;

            /**
             * Creates a plain object from an EntityState message. Also converts values to other types if specified.
             * @param message EntityState
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.EntityState, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this EntityState to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for EntityState
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of an EnterEvent. */
        interface IEnterEvent {

            /** EnterEvent entity */
            entity?: (xunxian.scene.IEntityState|null);
        }

        /** Represents an EnterEvent. */
        class EnterEvent implements IEnterEvent {

            /**
             * Constructs a new EnterEvent.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IEnterEvent);

            /** EnterEvent entity. */
            public entity?: (xunxian.scene.IEntityState|null);

            /**
             * Creates a new EnterEvent instance using the specified properties.
             * @param [properties] Properties to set
             * @returns EnterEvent instance
             */
            public static create(properties?: xunxian.scene.IEnterEvent): xunxian.scene.EnterEvent;

            /**
             * Encodes the specified EnterEvent message. Does not implicitly {@link xunxian.scene.EnterEvent.verify|verify} messages.
             * @param message EnterEvent message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IEnterEvent, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EnterEvent message, length delimited. Does not implicitly {@link xunxian.scene.EnterEvent.verify|verify} messages.
             * @param message EnterEvent message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IEnterEvent, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an EnterEvent message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns EnterEvent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.EnterEvent;

            /**
             * Decodes an EnterEvent message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns EnterEvent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.EnterEvent;

            /**
             * Verifies an EnterEvent message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an EnterEvent message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns EnterEvent
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.EnterEvent;

            /**
             * Creates a plain object from an EnterEvent message. Also converts values to other types if specified.
             * @param message EnterEvent
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.EnterEvent, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this EnterEvent to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for EnterEvent
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a LeaveEvent. */
        interface ILeaveEvent {

            /** LeaveEvent entityId */
            entityId?: (number|Long|null);
        }

        /** Represents a LeaveEvent. */
        class LeaveEvent implements ILeaveEvent {

            /**
             * Constructs a new LeaveEvent.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.ILeaveEvent);

            /** LeaveEvent entityId. */
            public entityId: (number|Long);

            /**
             * Creates a new LeaveEvent instance using the specified properties.
             * @param [properties] Properties to set
             * @returns LeaveEvent instance
             */
            public static create(properties?: xunxian.scene.ILeaveEvent): xunxian.scene.LeaveEvent;

            /**
             * Encodes the specified LeaveEvent message. Does not implicitly {@link xunxian.scene.LeaveEvent.verify|verify} messages.
             * @param message LeaveEvent message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.ILeaveEvent, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified LeaveEvent message, length delimited. Does not implicitly {@link xunxian.scene.LeaveEvent.verify|verify} messages.
             * @param message LeaveEvent message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.ILeaveEvent, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a LeaveEvent message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns LeaveEvent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.LeaveEvent;

            /**
             * Decodes a LeaveEvent message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns LeaveEvent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.LeaveEvent;

            /**
             * Verifies a LeaveEvent message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a LeaveEvent message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns LeaveEvent
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.LeaveEvent;

            /**
             * Creates a plain object from a LeaveEvent message. Also converts values to other types if specified.
             * @param message LeaveEvent
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.LeaveEvent, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this LeaveEvent to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for LeaveEvent
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of an InteractRequest. */
        interface IInteractRequest {

            /** InteractRequest playerId */
            playerId?: (number|Long|null);

            /** InteractRequest npcId */
            npcId?: (number|null);

            /** InteractRequest action */
            action?: (string|null);
        }

        /** Represents an InteractRequest. */
        class InteractRequest implements IInteractRequest {

            /**
             * Constructs a new InteractRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IInteractRequest);

            /** InteractRequest playerId. */
            public playerId: (number|Long);

            /** InteractRequest npcId. */
            public npcId: number;

            /** InteractRequest action. */
            public action: string;

            /**
             * Creates a new InteractRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns InteractRequest instance
             */
            public static create(properties?: xunxian.scene.IInteractRequest): xunxian.scene.InteractRequest;

            /**
             * Encodes the specified InteractRequest message. Does not implicitly {@link xunxian.scene.InteractRequest.verify|verify} messages.
             * @param message InteractRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IInteractRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified InteractRequest message, length delimited. Does not implicitly {@link xunxian.scene.InteractRequest.verify|verify} messages.
             * @param message InteractRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IInteractRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an InteractRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns InteractRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.InteractRequest;

            /**
             * Decodes an InteractRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns InteractRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.InteractRequest;

            /**
             * Verifies an InteractRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an InteractRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns InteractRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.InteractRequest;

            /**
             * Creates a plain object from an InteractRequest message. Also converts values to other types if specified.
             * @param message InteractRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.InteractRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this InteractRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for InteractRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of an InteractResponse. */
        interface IInteractResponse {

            /** InteractResponse code */
            code?: (number|null);

            /** InteractResponse msg */
            msg?: (string|null);

            /** InteractResponse type */
            type?: (string|null);

            /** InteractResponse data */
            data?: (string|null);
        }

        /** Represents an InteractResponse. */
        class InteractResponse implements IInteractResponse {

            /**
             * Constructs a new InteractResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IInteractResponse);

            /** InteractResponse code. */
            public code: number;

            /** InteractResponse msg. */
            public msg: string;

            /** InteractResponse type. */
            public type: string;

            /** InteractResponse data. */
            public data: string;

            /**
             * Creates a new InteractResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns InteractResponse instance
             */
            public static create(properties?: xunxian.scene.IInteractResponse): xunxian.scene.InteractResponse;

            /**
             * Encodes the specified InteractResponse message. Does not implicitly {@link xunxian.scene.InteractResponse.verify|verify} messages.
             * @param message InteractResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IInteractResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified InteractResponse message, length delimited. Does not implicitly {@link xunxian.scene.InteractResponse.verify|verify} messages.
             * @param message InteractResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IInteractResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an InteractResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns InteractResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.InteractResponse;

            /**
             * Decodes an InteractResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns InteractResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.InteractResponse;

            /**
             * Verifies an InteractResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates an InteractResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns InteractResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.InteractResponse;

            /**
             * Creates a plain object from an InteractResponse message. Also converts values to other types if specified.
             * @param message InteractResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.InteractResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this InteractResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for InteractResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a ChatMessage. */
        interface IChatMessage {

            /** ChatMessage senderId */
            senderId?: (number|Long|null);

            /** ChatMessage senderName */
            senderName?: (string|null);

            /** ChatMessage channel */
            channel?: (number|null);

            /** ChatMessage text */
            text?: (string|null);

            /** ChatMessage timestamp */
            timestamp?: (number|Long|null);
        }

        /** Represents a ChatMessage. */
        class ChatMessage implements IChatMessage {

            /**
             * Constructs a new ChatMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IChatMessage);

            /** ChatMessage senderId. */
            public senderId: (number|Long);

            /** ChatMessage senderName. */
            public senderName: string;

            /** ChatMessage channel. */
            public channel: number;

            /** ChatMessage text. */
            public text: string;

            /** ChatMessage timestamp. */
            public timestamp: (number|Long);

            /**
             * Creates a new ChatMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ChatMessage instance
             */
            public static create(properties?: xunxian.scene.IChatMessage): xunxian.scene.ChatMessage;

            /**
             * Encodes the specified ChatMessage message. Does not implicitly {@link xunxian.scene.ChatMessage.verify|verify} messages.
             * @param message ChatMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IChatMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ChatMessage message, length delimited. Does not implicitly {@link xunxian.scene.ChatMessage.verify|verify} messages.
             * @param message ChatMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IChatMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ChatMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ChatMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.ChatMessage;

            /**
             * Decodes a ChatMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ChatMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.ChatMessage;

            /**
             * Verifies a ChatMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ChatMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ChatMessage
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.ChatMessage;

            /**
             * Creates a plain object from a ChatMessage message. Also converts values to other types if specified.
             * @param message ChatMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.ChatMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ChatMessage to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ChatMessage
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a SendChatRequest. */
        interface ISendChatRequest {

            /** SendChatRequest channel */
            channel?: (number|null);

            /** SendChatRequest text */
            text?: (string|null);

            /** SendChatRequest targetId */
            targetId?: (number|Long|null);
        }

        /** Represents a SendChatRequest. */
        class SendChatRequest implements ISendChatRequest {

            /**
             * Constructs a new SendChatRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.ISendChatRequest);

            /** SendChatRequest channel. */
            public channel: number;

            /** SendChatRequest text. */
            public text: string;

            /** SendChatRequest targetId. */
            public targetId: (number|Long);

            /**
             * Creates a new SendChatRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SendChatRequest instance
             */
            public static create(properties?: xunxian.scene.ISendChatRequest): xunxian.scene.SendChatRequest;

            /**
             * Encodes the specified SendChatRequest message. Does not implicitly {@link xunxian.scene.SendChatRequest.verify|verify} messages.
             * @param message SendChatRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.ISendChatRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SendChatRequest message, length delimited. Does not implicitly {@link xunxian.scene.SendChatRequest.verify|verify} messages.
             * @param message SendChatRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.ISendChatRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SendChatRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SendChatRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.SendChatRequest;

            /**
             * Decodes a SendChatRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SendChatRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.SendChatRequest;

            /**
             * Verifies a SendChatRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SendChatRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SendChatRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.SendChatRequest;

            /**
             * Creates a plain object from a SendChatRequest message. Also converts values to other types if specified.
             * @param message SendChatRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.SendChatRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SendChatRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SendChatRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a SendChatResponse. */
        interface ISendChatResponse {

            /** SendChatResponse code */
            code?: (number|null);

            /** SendChatResponse msg */
            msg?: (string|null);
        }

        /** Represents a SendChatResponse. */
        class SendChatResponse implements ISendChatResponse {

            /**
             * Constructs a new SendChatResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.ISendChatResponse);

            /** SendChatResponse code. */
            public code: number;

            /** SendChatResponse msg. */
            public msg: string;

            /**
             * Creates a new SendChatResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns SendChatResponse instance
             */
            public static create(properties?: xunxian.scene.ISendChatResponse): xunxian.scene.SendChatResponse;

            /**
             * Encodes the specified SendChatResponse message. Does not implicitly {@link xunxian.scene.SendChatResponse.verify|verify} messages.
             * @param message SendChatResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.ISendChatResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified SendChatResponse message, length delimited. Does not implicitly {@link xunxian.scene.SendChatResponse.verify|verify} messages.
             * @param message SendChatResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.ISendChatResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a SendChatResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns SendChatResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.SendChatResponse;

            /**
             * Decodes a SendChatResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns SendChatResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.SendChatResponse;

            /**
             * Verifies a SendChatResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a SendChatResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns SendChatResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.SendChatResponse;

            /**
             * Creates a plain object from a SendChatResponse message. Also converts values to other types if specified.
             * @param message SendChatResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.SendChatResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this SendChatResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for SendChatResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a Heartbeat. */
        interface IHeartbeat {

            /** Heartbeat timestamp */
            timestamp?: (number|Long|null);
        }

        /** Represents a Heartbeat. */
        class Heartbeat implements IHeartbeat {

            /**
             * Constructs a new Heartbeat.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IHeartbeat);

            /** Heartbeat timestamp. */
            public timestamp: (number|Long);

            /**
             * Creates a new Heartbeat instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Heartbeat instance
             */
            public static create(properties?: xunxian.scene.IHeartbeat): xunxian.scene.Heartbeat;

            /**
             * Encodes the specified Heartbeat message. Does not implicitly {@link xunxian.scene.Heartbeat.verify|verify} messages.
             * @param message Heartbeat message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IHeartbeat, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Heartbeat message, length delimited. Does not implicitly {@link xunxian.scene.Heartbeat.verify|verify} messages.
             * @param message Heartbeat message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IHeartbeat, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Heartbeat message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Heartbeat
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.Heartbeat;

            /**
             * Decodes a Heartbeat message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Heartbeat
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.Heartbeat;

            /**
             * Verifies a Heartbeat message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Heartbeat message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Heartbeat
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.Heartbeat;

            /**
             * Creates a plain object from a Heartbeat message. Also converts values to other types if specified.
             * @param message Heartbeat
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.Heartbeat, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Heartbeat to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Heartbeat
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a HeartbeatAck. */
        interface IHeartbeatAck {

            /** HeartbeatAck serverTime */
            serverTime?: (number|Long|null);
        }

        /** Represents a HeartbeatAck. */
        class HeartbeatAck implements IHeartbeatAck {

            /**
             * Constructs a new HeartbeatAck.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IHeartbeatAck);

            /** HeartbeatAck serverTime. */
            public serverTime: (number|Long);

            /**
             * Creates a new HeartbeatAck instance using the specified properties.
             * @param [properties] Properties to set
             * @returns HeartbeatAck instance
             */
            public static create(properties?: xunxian.scene.IHeartbeatAck): xunxian.scene.HeartbeatAck;

            /**
             * Encodes the specified HeartbeatAck message. Does not implicitly {@link xunxian.scene.HeartbeatAck.verify|verify} messages.
             * @param message HeartbeatAck message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IHeartbeatAck, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified HeartbeatAck message, length delimited. Does not implicitly {@link xunxian.scene.HeartbeatAck.verify|verify} messages.
             * @param message HeartbeatAck message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IHeartbeatAck, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a HeartbeatAck message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns HeartbeatAck
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.HeartbeatAck;

            /**
             * Decodes a HeartbeatAck message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns HeartbeatAck
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.HeartbeatAck;

            /**
             * Verifies a HeartbeatAck message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a HeartbeatAck message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns HeartbeatAck
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.HeartbeatAck;

            /**
             * Creates a plain object from a HeartbeatAck message. Also converts values to other types if specified.
             * @param message HeartbeatAck
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.HeartbeatAck, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this HeartbeatAck to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for HeartbeatAck
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a KickOutEvent. */
        interface IKickOutEvent {

            /** KickOutEvent reason */
            reason?: (string|null);
        }

        /** Represents a KickOutEvent. */
        class KickOutEvent implements IKickOutEvent {

            /**
             * Constructs a new KickOutEvent.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IKickOutEvent);

            /** KickOutEvent reason. */
            public reason: string;

            /**
             * Creates a new KickOutEvent instance using the specified properties.
             * @param [properties] Properties to set
             * @returns KickOutEvent instance
             */
            public static create(properties?: xunxian.scene.IKickOutEvent): xunxian.scene.KickOutEvent;

            /**
             * Encodes the specified KickOutEvent message. Does not implicitly {@link xunxian.scene.KickOutEvent.verify|verify} messages.
             * @param message KickOutEvent message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IKickOutEvent, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified KickOutEvent message, length delimited. Does not implicitly {@link xunxian.scene.KickOutEvent.verify|verify} messages.
             * @param message KickOutEvent message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IKickOutEvent, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a KickOutEvent message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns KickOutEvent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.KickOutEvent;

            /**
             * Decodes a KickOutEvent message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns KickOutEvent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.KickOutEvent;

            /**
             * Verifies a KickOutEvent message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a KickOutEvent message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns KickOutEvent
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.KickOutEvent;

            /**
             * Creates a plain object from a KickOutEvent message. Also converts values to other types if specified.
             * @param message KickOutEvent
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.KickOutEvent, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this KickOutEvent to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for KickOutEvent
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a ReconnectRequest. */
        interface IReconnectRequest {

            /** ReconnectRequest token */
            token?: (string|null);

            /** ReconnectRequest playerId */
            playerId?: (number|Long|null);

            /** ReconnectRequest lastSeq */
            lastSeq?: (number|null);
        }

        /** Represents a ReconnectRequest. */
        class ReconnectRequest implements IReconnectRequest {

            /**
             * Constructs a new ReconnectRequest.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IReconnectRequest);

            /** ReconnectRequest token. */
            public token: string;

            /** ReconnectRequest playerId. */
            public playerId: (number|Long);

            /** ReconnectRequest lastSeq. */
            public lastSeq: number;

            /**
             * Creates a new ReconnectRequest instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ReconnectRequest instance
             */
            public static create(properties?: xunxian.scene.IReconnectRequest): xunxian.scene.ReconnectRequest;

            /**
             * Encodes the specified ReconnectRequest message. Does not implicitly {@link xunxian.scene.ReconnectRequest.verify|verify} messages.
             * @param message ReconnectRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IReconnectRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ReconnectRequest message, length delimited. Does not implicitly {@link xunxian.scene.ReconnectRequest.verify|verify} messages.
             * @param message ReconnectRequest message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IReconnectRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ReconnectRequest message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ReconnectRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.ReconnectRequest;

            /**
             * Decodes a ReconnectRequest message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ReconnectRequest
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.ReconnectRequest;

            /**
             * Verifies a ReconnectRequest message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ReconnectRequest message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ReconnectRequest
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.ReconnectRequest;

            /**
             * Creates a plain object from a ReconnectRequest message. Also converts values to other types if specified.
             * @param message ReconnectRequest
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.ReconnectRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ReconnectRequest to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ReconnectRequest
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a ReconnectResponse. */
        interface IReconnectResponse {

            /** ReconnectResponse code */
            code?: (number|null);

            /** ReconnectResponse msg */
            msg?: (string|null);

            /** ReconnectResponse entities */
            entities?: (xunxian.scene.IEntityState[]|null);

            /** ReconnectResponse posX */
            posX?: (number|null);

            /** ReconnectResponse posY */
            posY?: (number|null);

            /** ReconnectResponse serverSeq */
            serverSeq?: (number|null);
        }

        /** Represents a ReconnectResponse. */
        class ReconnectResponse implements IReconnectResponse {

            /**
             * Constructs a new ReconnectResponse.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IReconnectResponse);

            /** ReconnectResponse code. */
            public code: number;

            /** ReconnectResponse msg. */
            public msg: string;

            /** ReconnectResponse entities. */
            public entities: xunxian.scene.IEntityState[];

            /** ReconnectResponse posX. */
            public posX: number;

            /** ReconnectResponse posY. */
            public posY: number;

            /** ReconnectResponse serverSeq. */
            public serverSeq: number;

            /**
             * Creates a new ReconnectResponse instance using the specified properties.
             * @param [properties] Properties to set
             * @returns ReconnectResponse instance
             */
            public static create(properties?: xunxian.scene.IReconnectResponse): xunxian.scene.ReconnectResponse;

            /**
             * Encodes the specified ReconnectResponse message. Does not implicitly {@link xunxian.scene.ReconnectResponse.verify|verify} messages.
             * @param message ReconnectResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IReconnectResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified ReconnectResponse message, length delimited. Does not implicitly {@link xunxian.scene.ReconnectResponse.verify|verify} messages.
             * @param message ReconnectResponse message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IReconnectResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a ReconnectResponse message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ReconnectResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.ReconnectResponse;

            /**
             * Decodes a ReconnectResponse message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns ReconnectResponse
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.ReconnectResponse;

            /**
             * Verifies a ReconnectResponse message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a ReconnectResponse message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns ReconnectResponse
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.ReconnectResponse;

            /**
             * Creates a plain object from a ReconnectResponse message. Also converts values to other types if specified.
             * @param message ReconnectResponse
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.ReconnectResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this ReconnectResponse to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for ReconnectResponse
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a WsMessage. */
        interface IWsMessage {

            /** WsMessage type */
            type?: (string|null);

            /** WsMessage payload */
            payload?: (Uint8Array|null);
        }

        /** Represents a WsMessage. */
        class WsMessage implements IWsMessage {

            /**
             * Constructs a new WsMessage.
             * @param [properties] Properties to set
             */
            constructor(properties?: xunxian.scene.IWsMessage);

            /** WsMessage type. */
            public type: string;

            /** WsMessage payload. */
            public payload: Uint8Array;

            /**
             * Creates a new WsMessage instance using the specified properties.
             * @param [properties] Properties to set
             * @returns WsMessage instance
             */
            public static create(properties?: xunxian.scene.IWsMessage): xunxian.scene.WsMessage;

            /**
             * Encodes the specified WsMessage message. Does not implicitly {@link xunxian.scene.WsMessage.verify|verify} messages.
             * @param message WsMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: xunxian.scene.IWsMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified WsMessage message, length delimited. Does not implicitly {@link xunxian.scene.WsMessage.verify|verify} messages.
             * @param message WsMessage message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: xunxian.scene.IWsMessage, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a WsMessage message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns WsMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): xunxian.scene.WsMessage;

            /**
             * Decodes a WsMessage message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns WsMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): xunxian.scene.WsMessage;

            /**
             * Verifies a WsMessage message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a WsMessage message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns WsMessage
             */
            public static fromObject(object: { [k: string]: any }): xunxian.scene.WsMessage;

            /**
             * Creates a plain object from a WsMessage message. Also converts values to other types if specified.
             * @param message WsMessage
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: xunxian.scene.WsMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this WsMessage to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for WsMessage
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }
}
