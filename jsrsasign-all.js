/*! CryptoJS v3.1.2 core-fix.js
 * code.google.com/p/crypto-js
 * (c) 2009-2013 by Jeff Mott. All rights reserved.
 * code.google.com/p/crypto-js/wiki/License
 * THIS IS FIX of 'core.js' to fix Hmac issue.
 * https://code.google.com/p/crypto-js/issues/detail?id=84
 * https://crypto-js.googlecode.com/svn-history/r667/branches/3.x/src/core.js
 */
/**
 * CryptoJS core components.
 */
var CryptoJS = CryptoJS || (function (Math, undefined) {
    /**
     * CryptoJS namespace.
     */
    var C = {};

    /**
     * Library namespace.
     */
    var C_lib = C.lib = {};

    /**
     * Base object for prototypal inheritance.
     */
    var Base = C_lib.Base = (function () {
        function F() {}

        return {
            /**
             * Creates a new object that inherits from this object.
             *
             * @param {Object} overrides Properties to copy into the new object.
             *
             * @return {Object} The new object.
             *
             * @static
             *
             * @example
             *
             *     var MyType = CryptoJS.lib.Base.extend({
             *         field: 'value',
             *
             *         method: function () {
             *         }
             *     });
             */
            extend: function (overrides) {
                // Spawn
                F.prototype = this;
                var subtype = new F();

                // Augment
                if (overrides) {
                    subtype.mixIn(overrides);
                }

                // Create default initializer
                if (!subtype.hasOwnProperty('init')) {
                    subtype.init = function () {
                        subtype.$super.init.apply(this, arguments);
                    };
                }

                // Initializer's prototype is the subtype object
                subtype.init.prototype = subtype;

                // Reference supertype
                subtype.$super = this;

                return subtype;
            },

            /**
             * Extends this object and runs the init method.
             * Arguments to create() will be passed to init().
             *
             * @return {Object} The new object.
             *
             * @static
             *
             * @example
             *
             *     var instance = MyType.create();
             */
            create: function () {
                var instance = this.extend();
                instance.init.apply(instance, arguments);

                return instance;
            },

            /**
             * Initializes a newly created object.
             * Override this method to add some logic when your objects are created.
             *
             * @example
             *
             *     var MyType = CryptoJS.lib.Base.extend({
             *         init: function () {
             *             // ...
             *         }
             *     });
             */
            init: function () {
            },

            /**
             * Copies properties into this object.
             *
             * @param {Object} properties The properties to mix in.
             *
             * @example
             *
             *     MyType.mixIn({
             *         field: 'value'
             *     });
             */
            mixIn: function (properties) {
                for (var propertyName in properties) {
                    if (properties.hasOwnProperty(propertyName)) {
                        this[propertyName] = properties[propertyName];
                    }
                }

                // IE won't copy toString using the loop above
                if (properties.hasOwnProperty('toString')) {
                    this.toString = properties.toString;
                }
            },

            /**
             * Creates a copy of this object.
             *
             * @return {Object} The clone.
             *
             * @example
             *
             *     var clone = instance.clone();
             */
            clone: function () {
                return this.init.prototype.extend(this);
            }
        };
    }());

    /**
     * An array of 32-bit words.
     *
     * @property {Array} words The array of 32-bit words.
     * @property {number} sigBytes The number of significant bytes in this word array.
     */
    var WordArray = C_lib.WordArray = Base.extend({
        /**
         * Initializes a newly created word array.
         *
         * @param {Array} words (Optional) An array of 32-bit words.
         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
         *
         * @example
         *
         *     var wordArray = CryptoJS.lib.WordArray.create();
         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
         */
        init: function (words, sigBytes) {
            words = this.words = words || [];

            if (sigBytes != undefined) {
                this.sigBytes = sigBytes;
            } else {
                this.sigBytes = words.length * 4;
            }
        },

        /**
         * Converts this word array to a string.
         *
         * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
         *
         * @return {string} The stringified word array.
         *
         * @example
         *
         *     var string = wordArray + '';
         *     var string = wordArray.toString();
         *     var string = wordArray.toString(CryptoJS.enc.Utf8);
         */
        toString: function (encoder) {
            return (encoder || Hex).stringify(this);
        },

        /**
         * Concatenates a word array to this word array.
         *
         * @param {WordArray} wordArray The word array to append.
         *
         * @return {WordArray} This word array.
         *
         * @example
         *
         *     wordArray1.concat(wordArray2);
         */
        concat: function (wordArray) {
            // Shortcuts
            var thisWords = this.words;
            var thatWords = wordArray.words;
            var thisSigBytes = this.sigBytes;
            var thatSigBytes = wordArray.sigBytes;

            // Clamp excess bits
            this.clamp();

            // Concat
            if (thisSigBytes % 4) {
                // Copy one byte at a time
                for (var i = 0; i < thatSigBytes; i++) {
                    var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                    thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
                }
            } else {
                // Copy one word at a time
                for (var i = 0; i < thatSigBytes; i += 4) {
                    thisWords[(thisSigBytes + i) >>> 2] = thatWords[i >>> 2];
                }
            }
            this.sigBytes += thatSigBytes;

            // Chainable
            return this;
        },

        /**
         * Removes insignificant bits.
         *
         * @example
         *
         *     wordArray.clamp();
         */
        clamp: function () {
            // Shortcuts
            var words = this.words;
            var sigBytes = this.sigBytes;

            // Clamp
            words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
            words.length = Math.ceil(sigBytes / 4);
        },

        /**
         * Creates a copy of this word array.
         *
         * @return {WordArray} The clone.
         *
         * @example
         *
         *     var clone = wordArray.clone();
         */
        clone: function () {
            var clone = Base.clone.call(this);
            clone.words = this.words.slice(0);

            return clone;
        },

        /**
         * Creates a word array filled with random bytes.
         *
         * @param {number} nBytes The number of random bytes to generate.
         *
         * @return {WordArray} The random word array.
         *
         * @static
         *
         * @example
         *
         *     var wordArray = CryptoJS.lib.WordArray.random(16);
         */
        random: function (nBytes) {
            var words = [];
            for (var i = 0; i < nBytes; i += 4) {
                words.push((Math.random() * 0x100000000) | 0);
            }

            return new WordArray.init(words, nBytes);
        }
    });

    /**
     * Encoder namespace.
     */
    var C_enc = C.enc = {};

    /**
     * Hex encoding strategy.
     */
    var Hex = C_enc.Hex = {
        /**
         * Converts a word array to a hex string.
         *
         * @param {WordArray} wordArray The word array.
         *
         * @return {string} The hex string.
         *
         * @static
         *
         * @example
         *
         *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
         */
        stringify: function (wordArray) {
            // Shortcuts
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;

            // Convert
            var hexChars = [];
            for (var i = 0; i < sigBytes; i++) {
                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                hexChars.push((bite >>> 4).toString(16));
                hexChars.push((bite & 0x0f).toString(16));
            }

            return hexChars.join('');
        },

        /**
         * Converts a hex string to a word array.
         *
         * @param {string} hexStr The hex string.
         *
         * @return {WordArray} The word array.
         *
         * @static
         *
         * @example
         *
         *     var wordArray = CryptoJS.enc.Hex.parse(hexString);
         */
        parse: function (hexStr) {
            // Shortcut
            var hexStrLength = hexStr.length;

            // Convert
            var words = [];
            for (var i = 0; i < hexStrLength; i += 2) {
                words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
            }

            return new WordArray.init(words, hexStrLength / 2);
        }
    };

    /**
     * Latin1 encoding strategy.
     */
    var Latin1 = C_enc.Latin1 = {
        /**
         * Converts a word array to a Latin1 string.
         *
         * @param {WordArray} wordArray The word array.
         *
         * @return {string} The Latin1 string.
         *
         * @static
         *
         * @example
         *
         *     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
         */
        stringify: function (wordArray) {
            // Shortcuts
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;

            // Convert
            var latin1Chars = [];
            for (var i = 0; i < sigBytes; i++) {
                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                latin1Chars.push(String.fromCharCode(bite));
            }

            return latin1Chars.join('');
        },

        /**
         * Converts a Latin1 string to a word array.
         *
         * @param {string} latin1Str The Latin1 string.
         *
         * @return {WordArray} The word array.
         *
         * @static
         *
         * @example
         *
         *     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
         */
        parse: function (latin1Str) {
            // Shortcut
            var latin1StrLength = latin1Str.length;

            // Convert
            var words = [];
            for (var i = 0; i < latin1StrLength; i++) {
                words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
            }

            return new WordArray.init(words, latin1StrLength);
        }
    };

    /**
     * UTF-8 encoding strategy.
     */
    var Utf8 = C_enc.Utf8 = {
        /**
         * Converts a word array to a UTF-8 string.
         *
         * @param {WordArray} wordArray The word array.
         *
         * @return {string} The UTF-8 string.
         *
         * @static
         *
         * @example
         *
         *     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
         */
        stringify: function (wordArray) {
            try {
                return decodeURIComponent(escape(Latin1.stringify(wordArray)));
            } catch (e) {
                throw new Error('Malformed UTF-8 data');
            }
        },

        /**
         * Converts a UTF-8 string to a word array.
         *
         * @param {string} utf8Str The UTF-8 string.
         *
         * @return {WordArray} The word array.
         *
         * @static
         *
         * @example
         *
         *     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
         */
        parse: function (utf8Str) {
            return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
        }
    };

    /**
     * Abstract buffered block algorithm template.
     *
     * The property blockSize must be implemented in a concrete subtype.
     *
     * @property {number} _minBufferSize The number of blocks that should be kept unprocessed in the buffer. Default: 0
     */
    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
        /**
         * Resets this block algorithm's data buffer to its initial state.
         *
         * @example
         *
         *     bufferedBlockAlgorithm.reset();
         */
        reset: function () {
            // Initial values
            this._data = new WordArray.init();
            this._nDataBytes = 0;
        },

        /**
         * Adds new data to this block algorithm's buffer.
         *
         * @param {WordArray|string} data The data to append. Strings are converted to a WordArray using UTF-8.
         *
         * @example
         *
         *     bufferedBlockAlgorithm._append('data');
         *     bufferedBlockAlgorithm._append(wordArray);
         */
        _append: function (data) {
            // Convert string to WordArray, else assume WordArray already
            if (typeof data == 'string') {
                data = Utf8.parse(data);
            }

            // Append
            this._data.concat(data);
            this._nDataBytes += data.sigBytes;
        },

        /**
         * Processes available data blocks.
         *
         * This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
         *
         * @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
         *
         * @return {WordArray} The processed data.
         *
         * @example
         *
         *     var processedData = bufferedBlockAlgorithm._process();
         *     var processedData = bufferedBlockAlgorithm._process(!!'flush');
         */
        _process: function (doFlush) {
            // Shortcuts
            var data = this._data;
            var dataWords = data.words;
            var dataSigBytes = data.sigBytes;
            var blockSize = this.blockSize;
            var blockSizeBytes = blockSize * 4;

            // Count blocks ready
            var nBlocksReady = dataSigBytes / blockSizeBytes;
            if (doFlush) {
                // Round up to include partial blocks
                nBlocksReady = Math.ceil(nBlocksReady);
            } else {
                // Round down to include only full blocks,
                // less the number of blocks that must remain in the buffer
                nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
            }

            // Count words ready
            var nWordsReady = nBlocksReady * blockSize;

            // Count bytes ready
            var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);

            // Process blocks
            if (nWordsReady) {
                for (var offset = 0; offset < nWordsReady; offset += blockSize) {
                    // Perform concrete-algorithm logic
                    this._doProcessBlock(dataWords, offset);
                }

                // Remove processed words
                var processedWords = dataWords.splice(0, nWordsReady);
                data.sigBytes -= nBytesReady;
            }

            // Return processed words
            return new WordArray.init(processedWords, nBytesReady);
        },

        /**
         * Creates a copy of this object.
         *
         * @return {Object} The clone.
         *
         * @example
         *
         *     var clone = bufferedBlockAlgorithm.clone();
         */
        clone: function () {
            var clone = Base.clone.call(this);
            clone._data = this._data.clone();

            return clone;
        },

        _minBufferSize: 0
    });

    /**
     * Abstract hasher template.
     *
     * @property {number} blockSize The number of 32-bit words this hasher operates on. Default: 16 (512 bits)
     */
    var Hasher = C_lib.Hasher = BufferedBlockAlgorithm.extend({
        /**
         * Configuration options.
         */
        cfg: Base.extend(),

        /**
         * Initializes a newly created hasher.
         *
         * @param {Object} cfg (Optional) The configuration options to use for this hash computation.
         *
         * @example
         *
         *     var hasher = CryptoJS.algo.SHA256.create();
         */
        init: function (cfg) {
            // Apply config defaults
            this.cfg = this.cfg.extend(cfg);

            // Set initial values
            this.reset();
        },

        /**
         * Resets this hasher to its initial state.
         *
         * @example
         *
         *     hasher.reset();
         */
        reset: function () {
            // Reset data buffer
            BufferedBlockAlgorithm.reset.call(this);

            // Perform concrete-hasher logic
            this._doReset();
        },

        /**
         * Updates this hasher with a message.
         *
         * @param {WordArray|string} messageUpdate The message to append.
         *
         * @return {Hasher} This hasher.
         *
         * @example
         *
         *     hasher.update('message');
         *     hasher.update(wordArray);
         */
        update: function (messageUpdate) {
            // Append
            this._append(messageUpdate);

            // Update the hash
            this._process();

            // Chainable
            return this;
        },

        /**
         * Finalizes the hash computation.
         * Note that the finalize operation is effectively a destructive, read-once operation.
         *
         * @param {WordArray|string} messageUpdate (Optional) A final message update.
         *
         * @return {WordArray} The hash.
         *
         * @example
         *
         *     var hash = hasher.finalize();
         *     var hash = hasher.finalize('message');
         *     var hash = hasher.finalize(wordArray);
         */
        finalize: function (messageUpdate) {
            // Final message update
            if (messageUpdate) {
                this._append(messageUpdate);
            }

            // Perform concrete-hasher logic
            var hash = this._doFinalize();

            return hash;
        },

        blockSize: 512/32,

        /**
         * Creates a shortcut function to a hasher's object interface.
         *
         * @param {Hasher} hasher The hasher to create a helper for.
         *
         * @return {Function} The shortcut function.
         *
         * @static
         *
         * @example
         *
         *     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
         */
        _createHelper: function (hasher) {
            return function (message, cfg) {
                return new hasher.init(cfg).finalize(message);
            };
        },

        /**
         * Creates a shortcut function to the HMAC's object interface.
         *
         * @param {Hasher} hasher The hasher to use in this HMAC helper.
         *
         * @return {Function} The shortcut function.
         *
         * @static
         *
         * @example
         *
         *     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
         */
        _createHmacHelper: function (hasher) {
            return function (message, key) {
                return new C_algo.HMAC.init(hasher, key).finalize(message);
            };
        }
    });

    /**
     * Algorithm namespace.
     */
    var C_algo = C.algo = {};

    return C;
}(Math));
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
/**
 * Cipher core components.
 */
CryptoJS.lib.Cipher || (function (undefined) {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var Base = C_lib.Base;
    var WordArray = C_lib.WordArray;
    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm;
    var C_enc = C.enc;
    var Utf8 = C_enc.Utf8;
    var Base64 = C_enc.Base64;
    var C_algo = C.algo;
    var EvpKDF = C_algo.EvpKDF;

    /**
     * Abstract base cipher template.
     *
     * @property {number} keySize This cipher's key size. Default: 4 (128 bits)
     * @property {number} ivSize This cipher's IV size. Default: 4 (128 bits)
     * @property {number} _ENC_XFORM_MODE A constant representing encryption mode.
     * @property {number} _DEC_XFORM_MODE A constant representing decryption mode.
     */
    var Cipher = C_lib.Cipher = BufferedBlockAlgorithm.extend({
        /**
         * Configuration options.
         *
         * @property {WordArray} iv The IV to use for this operation.
         */
        cfg: Base.extend(),

        /**
         * Creates this cipher in encryption mode.
         *
         * @param {WordArray} key The key.
         * @param {Object} cfg (Optional) The configuration options to use for this operation.
         *
         * @return {Cipher} A cipher instance.
         *
         * @static
         *
         * @example
         *
         *     var cipher = CryptoJS.algo.AES.createEncryptor(keyWordArray, { iv: ivWordArray });
         */
        createEncryptor: function (key, cfg) {
            return this.create(this._ENC_XFORM_MODE, key, cfg);
        },

        /**
         * Creates this cipher in decryption mode.
         *
         * @param {WordArray} key The key.
         * @param {Object} cfg (Optional) The configuration options to use for this operation.
         *
         * @return {Cipher} A cipher instance.
         *
         * @static
         *
         * @example
         *
         *     var cipher = CryptoJS.algo.AES.createDecryptor(keyWordArray, { iv: ivWordArray });
         */
        createDecryptor: function (key, cfg) {
            return this.create(this._DEC_XFORM_MODE, key, cfg);
        },

        /**
         * Initializes a newly created cipher.
         *
         * @param {number} xformMode Either the encryption or decryption transormation mode constant.
         * @param {WordArray} key The key.
         * @param {Object} cfg (Optional) The configuration options to use for this operation.
         *
         * @example
         *
         *     var cipher = CryptoJS.algo.AES.create(CryptoJS.algo.AES._ENC_XFORM_MODE, keyWordArray, { iv: ivWordArray });
         */
        init: function (xformMode, key, cfg) {
            // Apply config defaults
            this.cfg = this.cfg.extend(cfg);

            // Store transform mode and key
            this._xformMode = xformMode;
            this._key = key;

            // Set initial values
            this.reset();
        },

        /**
         * Resets this cipher to its initial state.
         *
         * @example
         *
         *     cipher.reset();
         */
        reset: function () {
            // Reset data buffer
            BufferedBlockAlgorithm.reset.call(this);

            // Perform concrete-cipher logic
            this._doReset();
        },

        /**
         * Adds data to be encrypted or decrypted.
         *
         * @param {WordArray|string} dataUpdate The data to encrypt or decrypt.
         *
         * @return {WordArray} The data after processing.
         *
         * @example
         *
         *     var encrypted = cipher.process('data');
         *     var encrypted = cipher.process(wordArray);
         */
        process: function (dataUpdate) {
            // Append
            this._append(dataUpdate);

            // Process available blocks
            return this._process();
        },

        /**
         * Finalizes the encryption or decryption process.
         * Note that the finalize operation is effectively a destructive, read-once operation.
         *
         * @param {WordArray|string} dataUpdate The final data to encrypt or decrypt.
         *
         * @return {WordArray} The data after final processing.
         *
         * @example
         *
         *     var encrypted = cipher.finalize();
         *     var encrypted = cipher.finalize('data');
         *     var encrypted = cipher.finalize(wordArray);
         */
        finalize: function (dataUpdate) {
            // Final data update
            if (dataUpdate) {
                this._append(dataUpdate);
            }

            // Perform concrete-cipher logic
            var finalProcessedData = this._doFinalize();

            return finalProcessedData;
        },

        keySize: 128/32,

        ivSize: 128/32,

        _ENC_XFORM_MODE: 1,

        _DEC_XFORM_MODE: 2,

        /**
         * Creates shortcut functions to a cipher's object interface.
         *
         * @param {Cipher} cipher The cipher to create a helper for.
         *
         * @return {Object} An object with encrypt and decrypt shortcut functions.
         *
         * @static
         *
         * @example
         *
         *     var AES = CryptoJS.lib.Cipher._createHelper(CryptoJS.algo.AES);
         */
        _createHelper: (function () {
            function selectCipherStrategy(key) {
                if (typeof key == 'string') {
                    return PasswordBasedCipher;
                } else {
                    return SerializableCipher;
                }
            }

            return function (cipher) {
                return {
                    encrypt: function (message, key, cfg) {
                        return selectCipherStrategy(key).encrypt(cipher, message, key, cfg);
                    },

                    decrypt: function (ciphertext, key, cfg) {
                        return selectCipherStrategy(key).decrypt(cipher, ciphertext, key, cfg);
                    }
                };
            };
        }())
    });

    /**
     * Abstract base stream cipher template.
     *
     * @property {number} blockSize The number of 32-bit words this cipher operates on. Default: 1 (32 bits)
     */
    var StreamCipher = C_lib.StreamCipher = Cipher.extend({
        _doFinalize: function () {
            // Process partial blocks
            var finalProcessedBlocks = this._process(!!'flush');

            return finalProcessedBlocks;
        },

        blockSize: 1
    });

    /**
     * Mode namespace.
     */
    var C_mode = C.mode = {};

    /**
     * Abstract base block cipher mode template.
     */
    var BlockCipherMode = C_lib.BlockCipherMode = Base.extend({
        /**
         * Creates this mode for encryption.
         *
         * @param {Cipher} cipher A block cipher instance.
         * @param {Array} iv The IV words.
         *
         * @static
         *
         * @example
         *
         *     var mode = CryptoJS.mode.CBC.createEncryptor(cipher, iv.words);
         */
        createEncryptor: function (cipher, iv) {
            return this.Encryptor.create(cipher, iv);
        },

        /**
         * Creates this mode for decryption.
         *
         * @param {Cipher} cipher A block cipher instance.
         * @param {Array} iv The IV words.
         *
         * @static
         *
         * @example
         *
         *     var mode = CryptoJS.mode.CBC.createDecryptor(cipher, iv.words);
         */
        createDecryptor: function (cipher, iv) {
            return this.Decryptor.create(cipher, iv);
        },

        /**
         * Initializes a newly created mode.
         *
         * @param {Cipher} cipher A block cipher instance.
         * @param {Array} iv The IV words.
         *
         * @example
         *
         *     var mode = CryptoJS.mode.CBC.Encryptor.create(cipher, iv.words);
         */
        init: function (cipher, iv) {
            this._cipher = cipher;
            this._iv = iv;
        }
    });

    /**
     * Cipher Block Chaining mode.
     */
    var CBC = C_mode.CBC = (function () {
        /**
         * Abstract base CBC mode.
         */
        var CBC = BlockCipherMode.extend();

        /**
         * CBC encryptor.
         */
        CBC.Encryptor = CBC.extend({
            /**
             * Processes the data block at offset.
             *
             * @param {Array} words The data words to operate on.
             * @param {number} offset The offset where the block starts.
             *
             * @example
             *
             *     mode.processBlock(data.words, offset);
             */
            processBlock: function (words, offset) {
                // Shortcuts
                var cipher = this._cipher;
                var blockSize = cipher.blockSize;

                // XOR and encrypt
                xorBlock.call(this, words, offset, blockSize);
                cipher.encryptBlock(words, offset);

                // Remember this block to use with next block
                this._prevBlock = words.slice(offset, offset + blockSize);
            }
        });

        /**
         * CBC decryptor.
         */
        CBC.Decryptor = CBC.extend({
            /**
             * Processes the data block at offset.
             *
             * @param {Array} words The data words to operate on.
             * @param {number} offset The offset where the block starts.
             *
             * @example
             *
             *     mode.processBlock(data.words, offset);
             */
            processBlock: function (words, offset) {
                // Shortcuts
                var cipher = this._cipher;
                var blockSize = cipher.blockSize;

                // Remember this block to use with next block
                var thisBlock = words.slice(offset, offset + blockSize);

                // Decrypt and XOR
                cipher.decryptBlock(words, offset);
                xorBlock.call(this, words, offset, blockSize);

                // This block becomes the previous block
                this._prevBlock = thisBlock;
            }
        });

        function xorBlock(words, offset, blockSize) {
            // Shortcut
            var iv = this._iv;

            // Choose mixing block
            if (iv) {
                var block = iv;

                // Remove IV for subsequent blocks
                this._iv = undefined;
            } else {
                var block = this._prevBlock;
            }

            // XOR blocks
            for (var i = 0; i < blockSize; i++) {
                words[offset + i] ^= block[i];
            }
        }

        return CBC;
    }());

    /**
     * Padding namespace.
     */
    var C_pad = C.pad = {};

    /**
     * PKCS #5/7 padding strategy.
     */
    var Pkcs7 = C_pad.Pkcs7 = {
        /**
         * Pads data using the algorithm defined in PKCS #5/7.
         *
         * @param {WordArray} data The data to pad.
         * @param {number} blockSize The multiple that the data should be padded to.
         *
         * @static
         *
         * @example
         *
         *     CryptoJS.pad.Pkcs7.pad(wordArray, 4);
         */
        pad: function (data, blockSize) {
            // Shortcut
            var blockSizeBytes = blockSize * 4;

            // Count padding bytes
            var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;

            // Create padding word
            var paddingWord = (nPaddingBytes << 24) | (nPaddingBytes << 16) | (nPaddingBytes << 8) | nPaddingBytes;

            // Create padding
            var paddingWords = [];
            for (var i = 0; i < nPaddingBytes; i += 4) {
                paddingWords.push(paddingWord);
            }
            var padding = WordArray.create(paddingWords, nPaddingBytes);

            // Add padding
            data.concat(padding);
        },

        /**
         * Unpads data that had been padded using the algorithm defined in PKCS #5/7.
         *
         * @param {WordArray} data The data to unpad.
         *
         * @static
         *
         * @example
         *
         *     CryptoJS.pad.Pkcs7.unpad(wordArray);
         */
        unpad: function (data) {
            // Get number of padding bytes from last byte
            var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

            // Remove padding
            data.sigBytes -= nPaddingBytes;
        }
    };

    /**
     * Abstract base block cipher template.
     *
     * @property {number} blockSize The number of 32-bit words this cipher operates on. Default: 4 (128 bits)
     */
    var BlockCipher = C_lib.BlockCipher = Cipher.extend({
        /**
         * Configuration options.
         *
         * @property {Mode} mode The block mode to use. Default: CBC
         * @property {Padding} padding The padding strategy to use. Default: Pkcs7
         */
        cfg: Cipher.cfg.extend({
            mode: CBC,
            padding: Pkcs7
        }),

        reset: function () {
            // Reset cipher
            Cipher.reset.call(this);

            // Shortcuts
            var cfg = this.cfg;
            var iv = cfg.iv;
            var mode = cfg.mode;

            // Reset block mode
            if (this._xformMode == this._ENC_XFORM_MODE) {
                var modeCreator = mode.createEncryptor;
            } else /* if (this._xformMode == this._DEC_XFORM_MODE) */ {
                var modeCreator = mode.createDecryptor;

                // Keep at least one block in the buffer for unpadding
                this._minBufferSize = 1;
            }
            this._mode = modeCreator.call(mode, this, iv && iv.words);
        },

        _doProcessBlock: function (words, offset) {
            this._mode.processBlock(words, offset);
        },

        _doFinalize: function () {
            // Shortcut
            var padding = this.cfg.padding;

            // Finalize
            if (this._xformMode == this._ENC_XFORM_MODE) {
                // Pad data
                padding.pad(this._data, this.blockSize);

                // Process final blocks
                var finalProcessedBlocks = this._process(!!'flush');
            } else /* if (this._xformMode == this._DEC_XFORM_MODE) */ {
                // Process final blocks
                var finalProcessedBlocks = this._process(!!'flush');

                // Unpad data
                padding.unpad(finalProcessedBlocks);
            }

            return finalProcessedBlocks;
        },

        blockSize: 128/32
    });

    /**
     * A collection of cipher parameters.
     *
     * @property {WordArray} ciphertext The raw ciphertext.
     * @property {WordArray} key The key to this ciphertext.
     * @property {WordArray} iv The IV used in the ciphering operation.
     * @property {WordArray} salt The salt used with a key derivation function.
     * @property {Cipher} algorithm The cipher algorithm.
     * @property {Mode} mode The block mode used in the ciphering operation.
     * @property {Padding} padding The padding scheme used in the ciphering operation.
     * @property {number} blockSize The block size of the cipher.
     * @property {Format} formatter The default formatting strategy to convert this cipher params object to a string.
     */
    var CipherParams = C_lib.CipherParams = Base.extend({
        /**
         * Initializes a newly created cipher params object.
         *
         * @param {Object} cipherParams An object with any of the possible cipher parameters.
         *
         * @example
         *
         *     var cipherParams = CryptoJS.lib.CipherParams.create({
         *         ciphertext: ciphertextWordArray,
         *         key: keyWordArray,
         *         iv: ivWordArray,
         *         salt: saltWordArray,
         *         algorithm: CryptoJS.algo.AES,
         *         mode: CryptoJS.mode.CBC,
         *         padding: CryptoJS.pad.PKCS7,
         *         blockSize: 4,
         *         formatter: CryptoJS.format.OpenSSL
         *     });
         */
        init: function (cipherParams) {
            this.mixIn(cipherParams);
        },

        /**
         * Converts this cipher params object to a string.
         *
         * @param {Format} formatter (Optional) The formatting strategy to use.
         *
         * @return {string} The stringified cipher params.
         *
         * @throws Error If neither the formatter nor the default formatter is set.
         *
         * @example
         *
         *     var string = cipherParams + '';
         *     var string = cipherParams.toString();
         *     var string = cipherParams.toString(CryptoJS.format.OpenSSL);
         */
        toString: function (formatter) {
            return (formatter || this.formatter).stringify(this);
        }
    });

    /**
     * Format namespace.
     */
    var C_format = C.format = {};

    /**
     * OpenSSL formatting strategy.
     */
    var OpenSSLFormatter = C_format.OpenSSL = {
        /**
         * Converts a cipher params object to an OpenSSL-compatible string.
         *
         * @param {CipherParams} cipherParams The cipher params object.
         *
         * @return {string} The OpenSSL-compatible string.
         *
         * @static
         *
         * @example
         *
         *     var openSSLString = CryptoJS.format.OpenSSL.stringify(cipherParams);
         */
        stringify: function (cipherParams) {
            // Shortcuts
            var ciphertext = cipherParams.ciphertext;
            var salt = cipherParams.salt;

            // Format
            if (salt) {
                var wordArray = WordArray.create([0x53616c74, 0x65645f5f]).concat(salt).concat(ciphertext);
            } else {
                var wordArray = ciphertext;
            }

            return wordArray.toString(Base64);
        },

        /**
         * Converts an OpenSSL-compatible string to a cipher params object.
         *
         * @param {string} openSSLStr The OpenSSL-compatible string.
         *
         * @return {CipherParams} The cipher params object.
         *
         * @static
         *
         * @example
         *
         *     var cipherParams = CryptoJS.format.OpenSSL.parse(openSSLString);
         */
        parse: function (openSSLStr) {
            // Parse base64
            var ciphertext = Base64.parse(openSSLStr);

            // Shortcut
            var ciphertextWords = ciphertext.words;

            // Test for salt
            if (ciphertextWords[0] == 0x53616c74 && ciphertextWords[1] == 0x65645f5f) {
                // Extract salt
                var salt = WordArray.create(ciphertextWords.slice(2, 4));

                // Remove salt from ciphertext
                ciphertextWords.splice(0, 4);
                ciphertext.sigBytes -= 16;
            }

            return CipherParams.create({ ciphertext: ciphertext, salt: salt });
        }
    };

    /**
     * A cipher wrapper that returns ciphertext as a serializable cipher params object.
     */
    var SerializableCipher = C_lib.SerializableCipher = Base.extend({
        /**
         * Configuration options.
         *
         * @property {Formatter} format The formatting strategy to convert cipher param objects to and from a string. Default: OpenSSL
         */
        cfg: Base.extend({
            format: OpenSSLFormatter
        }),

        /**
         * Encrypts a message.
         *
         * @param {Cipher} cipher The cipher algorithm to use.
         * @param {WordArray|string} message The message to encrypt.
         * @param {WordArray} key The key.
         * @param {Object} cfg (Optional) The configuration options to use for this operation.
         *
         * @return {CipherParams} A cipher params object.
         *
         * @static
         *
         * @example
         *
         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key);
         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, { iv: iv });
         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, { iv: iv, format: CryptoJS.format.OpenSSL });
         */
        encrypt: function (cipher, message, key, cfg) {
            // Apply config defaults
            cfg = this.cfg.extend(cfg);

            // Encrypt
            var encryptor = cipher.createEncryptor(key, cfg);
            var ciphertext = encryptor.finalize(message);

            // Shortcut
            var cipherCfg = encryptor.cfg;

            // Create and return serializable cipher params
            return CipherParams.create({
                ciphertext: ciphertext,
                key: key,
                iv: cipherCfg.iv,
                algorithm: cipher,
                mode: cipherCfg.mode,
                padding: cipherCfg.padding,
                blockSize: cipher.blockSize,
                formatter: cfg.format
            });
        },

        /**
         * Decrypts serialized ciphertext.
         *
         * @param {Cipher} cipher The cipher algorithm to use.
         * @param {CipherParams|string} ciphertext The ciphertext to decrypt.
         * @param {WordArray} key The key.
         * @param {Object} cfg (Optional) The configuration options to use for this operation.
         *
         * @return {WordArray} The plaintext.
         *
         * @static
         *
         * @example
         *
         *     var plaintext = CryptoJS.lib.SerializableCipher.decrypt(CryptoJS.algo.AES, formattedCiphertext, key, { iv: iv, format: CryptoJS.format.OpenSSL });
         *     var plaintext = CryptoJS.lib.SerializableCipher.decrypt(CryptoJS.algo.AES, ciphertextParams, key, { iv: iv, format: CryptoJS.format.OpenSSL });
         */
        decrypt: function (cipher, ciphertext, key, cfg) {
            // Apply config defaults
            cfg = this.cfg.extend(cfg);

            // Convert string to CipherParams
            ciphertext = this._parse(ciphertext, cfg.format);

            // Decrypt
            var plaintext = cipher.createDecryptor(key, cfg).finalize(ciphertext.ciphertext);

            return plaintext;
        },

        /**
         * Converts serialized ciphertext to CipherParams,
         * else assumed CipherParams already and returns ciphertext unchanged.
         *
         * @param {CipherParams|string} ciphertext The ciphertext.
         * @param {Formatter} format The formatting strategy to use to parse serialized ciphertext.
         *
         * @return {CipherParams} The unserialized ciphertext.
         *
         * @static
         *
         * @example
         *
         *     var ciphertextParams = CryptoJS.lib.SerializableCipher._parse(ciphertextStringOrParams, format);
         */
        _parse: function (ciphertext, format) {
            if (typeof ciphertext == 'string') {
                return format.parse(ciphertext, this);
            } else {
                return ciphertext;
            }
        }
    });

    /**
     * Key derivation function namespace.
     */
    var C_kdf = C.kdf = {};

    /**
     * OpenSSL key derivation function.
     */
    var OpenSSLKdf = C_kdf.OpenSSL = {
        /**
         * Derives a key and IV from a password.
         *
         * @param {string} password The password to derive from.
         * @param {number} keySize The size in words of the key to generate.
         * @param {number} ivSize The size in words of the IV to generate.
         * @param {WordArray|string} salt (Optional) A 64-bit salt to use. If omitted, a salt will be generated randomly.
         *
         * @return {CipherParams} A cipher params object with the key, IV, and salt.
         *
         * @static
         *
         * @example
         *
         *     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32);
         *     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32, 'saltsalt');
         */
        execute: function (password, keySize, ivSize, salt) {
            // Generate random salt
            if (!salt) {
                salt = WordArray.random(64/8);
            }

            // Derive key and IV
            var key = EvpKDF.create({ keySize: keySize + ivSize }).compute(password, salt);

            // Separate key and IV
            var iv = WordArray.create(key.words.slice(keySize), ivSize * 4);
            key.sigBytes = keySize * 4;

            // Return params
            return CipherParams.create({ key: key, iv: iv, salt: salt });
        }
    };

    /**
     * A serializable cipher wrapper that derives the key from a password,
     * and returns ciphertext as a serializable cipher params object.
     */
    var PasswordBasedCipher = C_lib.PasswordBasedCipher = SerializableCipher.extend({
        /**
         * Configuration options.
         *
         * @property {KDF} kdf The key derivation function to use to generate a key and IV from a password. Default: OpenSSL
         */
        cfg: SerializableCipher.cfg.extend({
            kdf: OpenSSLKdf
        }),

        /**
         * Encrypts a message using a password.
         *
         * @param {Cipher} cipher The cipher algorithm to use.
         * @param {WordArray|string} message The message to encrypt.
         * @param {string} password The password.
         * @param {Object} cfg (Optional) The configuration options to use for this operation.
         *
         * @return {CipherParams} A cipher params object.
         *
         * @static
         *
         * @example
         *
         *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(CryptoJS.algo.AES, message, 'password');
         *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(CryptoJS.algo.AES, message, 'password', { format: CryptoJS.format.OpenSSL });
         */
        encrypt: function (cipher, message, password, cfg) {
            // Apply config defaults
            cfg = this.cfg.extend(cfg);

            // Derive key and other params
            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize);

            // Add IV to config
            cfg.iv = derivedParams.iv;

            // Encrypt
            var ciphertext = SerializableCipher.encrypt.call(this, cipher, message, derivedParams.key, cfg);

            // Mix in derived params
            ciphertext.mixIn(derivedParams);

            return ciphertext;
        },

        /**
         * Decrypts serialized ciphertext using a password.
         *
         * @param {Cipher} cipher The cipher algorithm to use.
         * @param {CipherParams|string} ciphertext The ciphertext to decrypt.
         * @param {string} password The password.
         * @param {Object} cfg (Optional) The configuration options to use for this operation.
         *
         * @return {WordArray} The plaintext.
         *
         * @static
         *
         * @example
         *
         *     var plaintext = CryptoJS.lib.PasswordBasedCipher.decrypt(CryptoJS.algo.AES, formattedCiphertext, 'password', { format: CryptoJS.format.OpenSSL });
         *     var plaintext = CryptoJS.lib.PasswordBasedCipher.decrypt(CryptoJS.algo.AES, ciphertextParams, 'password', { format: CryptoJS.format.OpenSSL });
         */
        decrypt: function (cipher, ciphertext, password, cfg) {
            // Apply config defaults
            cfg = this.cfg.extend(cfg);

            // Convert string to CipherParams
            ciphertext = this._parse(ciphertext, cfg.format);

            // Derive key and other params
            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize, ciphertext.salt);

            // Add IV to config
            cfg.iv = derivedParams.iv;

            // Decrypt
            var plaintext = SerializableCipher.decrypt.call(this, cipher, ciphertext, derivedParams.key, cfg);

            return plaintext;
        }
    });
}());
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function () {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var BlockCipher = C_lib.BlockCipher;
    var C_algo = C.algo;

    // Lookup tables
    var SBOX = [];
    var INV_SBOX = [];
    var SUB_MIX_0 = [];
    var SUB_MIX_1 = [];
    var SUB_MIX_2 = [];
    var SUB_MIX_3 = [];
    var INV_SUB_MIX_0 = [];
    var INV_SUB_MIX_1 = [];
    var INV_SUB_MIX_2 = [];
    var INV_SUB_MIX_3 = [];

    // Compute lookup tables
    (function () {
        // Compute double table
        var d = [];
        for (var i = 0; i < 256; i++) {
            if (i < 128) {
                d[i] = i << 1;
            } else {
                d[i] = (i << 1) ^ 0x11b;
            }
        }

        // Walk GF(2^8)
        var x = 0;
        var xi = 0;
        for (var i = 0; i < 256; i++) {
            // Compute sbox
            var sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
            sx = (sx >>> 8) ^ (sx & 0xff) ^ 0x63;
            SBOX[x] = sx;
            INV_SBOX[sx] = x;

            // Compute multiplication
            var x2 = d[x];
            var x4 = d[x2];
            var x8 = d[x4];

            // Compute sub bytes, mix columns tables
            var t = (d[sx] * 0x101) ^ (sx * 0x1010100);
            SUB_MIX_0[x] = (t << 24) | (t >>> 8);
            SUB_MIX_1[x] = (t << 16) | (t >>> 16);
            SUB_MIX_2[x] = (t << 8)  | (t >>> 24);
            SUB_MIX_3[x] = t;

            // Compute inv sub bytes, inv mix columns tables
            var t = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100);
            INV_SUB_MIX_0[sx] = (t << 24) | (t >>> 8);
            INV_SUB_MIX_1[sx] = (t << 16) | (t >>> 16);
            INV_SUB_MIX_2[sx] = (t << 8)  | (t >>> 24);
            INV_SUB_MIX_3[sx] = t;

            // Compute next counter
            if (!x) {
                x = xi = 1;
            } else {
                x = x2 ^ d[d[d[x8 ^ x2]]];
                xi ^= d[d[xi]];
            }
        }
    }());

    // Precomputed Rcon lookup
    var RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

    /**
     * AES block cipher algorithm.
     */
    var AES = C_algo.AES = BlockCipher.extend({
        _doReset: function () {
            // Shortcuts
            var key = this._key;
            var keyWords = key.words;
            var keySize = key.sigBytes / 4;

            // Compute number of rounds
            var nRounds = this._nRounds = keySize + 6

            // Compute number of key schedule rows
            var ksRows = (nRounds + 1) * 4;

            // Compute key schedule
            var keySchedule = this._keySchedule = [];
            for (var ksRow = 0; ksRow < ksRows; ksRow++) {
                if (ksRow < keySize) {
                    keySchedule[ksRow] = keyWords[ksRow];
                } else {
                    var t = keySchedule[ksRow - 1];

                    if (!(ksRow % keySize)) {
                        // Rot word
                        t = (t << 8) | (t >>> 24);

                        // Sub word
                        t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff];

                        // Mix Rcon
                        t ^= RCON[(ksRow / keySize) | 0] << 24;
                    } else if (keySize > 6 && ksRow % keySize == 4) {
                        // Sub word
                        t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff];
                    }

                    keySchedule[ksRow] = keySchedule[ksRow - keySize] ^ t;
                }
            }

            // Compute inv key schedule
            var invKeySchedule = this._invKeySchedule = [];
            for (var invKsRow = 0; invKsRow < ksRows; invKsRow++) {
                var ksRow = ksRows - invKsRow;

                if (invKsRow % 4) {
                    var t = keySchedule[ksRow];
                } else {
                    var t = keySchedule[ksRow - 4];
                }

                if (invKsRow < 4 || ksRow <= 4) {
                    invKeySchedule[invKsRow] = t;
                } else {
                    invKeySchedule[invKsRow] = INV_SUB_MIX_0[SBOX[t >>> 24]] ^ INV_SUB_MIX_1[SBOX[(t >>> 16) & 0xff]] ^
                                               INV_SUB_MIX_2[SBOX[(t >>> 8) & 0xff]] ^ INV_SUB_MIX_3[SBOX[t & 0xff]];
                }
            }
        },

        encryptBlock: function (M, offset) {
            this._doCryptBlock(M, offset, this._keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX);
        },

        decryptBlock: function (M, offset) {
            // Swap 2nd and 4th rows
            var t = M[offset + 1];
            M[offset + 1] = M[offset + 3];
            M[offset + 3] = t;

            this._doCryptBlock(M, offset, this._invKeySchedule, INV_SUB_MIX_0, INV_SUB_MIX_1, INV_SUB_MIX_2, INV_SUB_MIX_3, INV_SBOX);

            // Inv swap 2nd and 4th rows
            var t = M[offset + 1];
            M[offset + 1] = M[offset + 3];
            M[offset + 3] = t;
        },

        _doCryptBlock: function (M, offset, keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX) {
            // Shortcut
            var nRounds = this._nRounds;

            // Get input, add round key
            var s0 = M[offset]     ^ keySchedule[0];
            var s1 = M[offset + 1] ^ keySchedule[1];
            var s2 = M[offset + 2] ^ keySchedule[2];
            var s3 = M[offset + 3] ^ keySchedule[3];

            // Key schedule row counter
            var ksRow = 4;

            // Rounds
            for (var round = 1; round < nRounds; round++) {
                // Shift rows, sub bytes, mix columns, add round key
                var t0 = SUB_MIX_0[s0 >>> 24] ^ SUB_MIX_1[(s1 >>> 16) & 0xff] ^ SUB_MIX_2[(s2 >>> 8) & 0xff] ^ SUB_MIX_3[s3 & 0xff] ^ keySchedule[ksRow++];
                var t1 = SUB_MIX_0[s1 >>> 24] ^ SUB_MIX_1[(s2 >>> 16) & 0xff] ^ SUB_MIX_2[(s3 >>> 8) & 0xff] ^ SUB_MIX_3[s0 & 0xff] ^ keySchedule[ksRow++];
                var t2 = SUB_MIX_0[s2 >>> 24] ^ SUB_MIX_1[(s3 >>> 16) & 0xff] ^ SUB_MIX_2[(s0 >>> 8) & 0xff] ^ SUB_MIX_3[s1 & 0xff] ^ keySchedule[ksRow++];
                var t3 = SUB_MIX_0[s3 >>> 24] ^ SUB_MIX_1[(s0 >>> 16) & 0xff] ^ SUB_MIX_2[(s1 >>> 8) & 0xff] ^ SUB_MIX_3[s2 & 0xff] ^ keySchedule[ksRow++];

                // Update state
                s0 = t0;
                s1 = t1;
                s2 = t2;
                s3 = t3;
            }

            // Shift rows, sub bytes, add round key
            var t0 = ((SBOX[s0 >>> 24] << 24) | (SBOX[(s1 >>> 16) & 0xff] << 16) | (SBOX[(s2 >>> 8) & 0xff] << 8) | SBOX[s3 & 0xff]) ^ keySchedule[ksRow++];
            var t1 = ((SBOX[s1 >>> 24] << 24) | (SBOX[(s2 >>> 16) & 0xff] << 16) | (SBOX[(s3 >>> 8) & 0xff] << 8) | SBOX[s0 & 0xff]) ^ keySchedule[ksRow++];
            var t2 = ((SBOX[s2 >>> 24] << 24) | (SBOX[(s3 >>> 16) & 0xff] << 16) | (SBOX[(s0 >>> 8) & 0xff] << 8) | SBOX[s1 & 0xff]) ^ keySchedule[ksRow++];
            var t3 = ((SBOX[s3 >>> 24] << 24) | (SBOX[(s0 >>> 16) & 0xff] << 16) | (SBOX[(s1 >>> 8) & 0xff] << 8) | SBOX[s2 & 0xff]) ^ keySchedule[ksRow++];

            // Set output
            M[offset]     = t0;
            M[offset + 1] = t1;
            M[offset + 2] = t2;
            M[offset + 3] = t3;
        },

        keySize: 256/32
    });

    /**
     * Shortcut functions to the cipher's object interface.
     *
     * @example
     *
     *     var ciphertext = CryptoJS.AES.encrypt(message, key, cfg);
     *     var plaintext  = CryptoJS.AES.decrypt(ciphertext, key, cfg);
     */
    C.AES = BlockCipher._createHelper(AES);
}());
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function () {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var C_enc = C.enc;

    /**
     * Base64 encoding strategy.
     */
    var Base64 = C_enc.Base64 = {
        /**
         * Converts a word array to a Base64 string.
         *
         * @param {WordArray} wordArray The word array.
         *
         * @return {string} The Base64 string.
         *
         * @static
         *
         * @example
         *
         *     var base64String = CryptoJS.enc.Base64.stringify(wordArray);
         */
        stringify: function (wordArray) {
            // Shortcuts
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var map = this._map;

            // Clamp excess bits
            wordArray.clamp();

            // Convert
            var base64Chars = [];
            for (var i = 0; i < sigBytes; i += 3) {
                var byte1 = (words[i >>> 2]       >>> (24 - (i % 4) * 8))       & 0xff;
                var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
                var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

                var triplet = (byte1 << 16) | (byte2 << 8) | byte3;

                for (var j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j++) {
                    base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
                }
            }

            // Add padding
            var paddingChar = map.charAt(64);
            if (paddingChar) {
                while (base64Chars.length % 4) {
                    base64Chars.push(paddingChar);
                }
            }

            return base64Chars.join('');
        },

        /**
         * Converts a Base64 string to a word array.
         *
         * @param {string} base64Str The Base64 string.
         *
         * @return {WordArray} The word array.
         *
         * @static
         *
         * @example
         *
         *     var wordArray = CryptoJS.enc.Base64.parse(base64String);
         */
        parse: function (base64Str) {
            // Shortcuts
            var base64StrLength = base64Str.length;
            var map = this._map;

            // Ignore padding
            var paddingChar = map.charAt(64);
            if (paddingChar) {
                var paddingIndex = base64Str.indexOf(paddingChar);
                if (paddingIndex != -1) {
                    base64StrLength = paddingIndex;
                }
            }

            // Convert
            var words = [];
            var nBytes = 0;
            for (var i = 0; i < base64StrLength; i++) {
                if (i % 4) {
                    var bits1 = map.indexOf(base64Str.charAt(i - 1)) << ((i % 4) * 2);
                    var bits2 = map.indexOf(base64Str.charAt(i)) >>> (6 - (i % 4) * 2);
                    words[nBytes >>> 2] |= (bits1 | bits2) << (24 - (nBytes % 4) * 8);
                    nBytes++;
                }
            }

            return WordArray.create(words, nBytes);
        },

        _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    };
}());
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function () {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var Base = C_lib.Base;
    var C_enc = C.enc;
    var Utf8 = C_enc.Utf8;
    var C_algo = C.algo;

    /**
     * HMAC algorithm.
     */
    var HMAC = C_algo.HMAC = Base.extend({
        /**
         * Initializes a newly created HMAC.
         *
         * @param {Hasher} hasher The hash algorithm to use.
         * @param {WordArray|string} key The secret key.
         *
         * @example
         *
         *     var hmacHasher = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, key);
         */
        init: function (hasher, key) {
            // Init hasher
            hasher = this._hasher = new hasher.init();

            // Convert string to WordArray, else assume WordArray already
            if (typeof key == 'string') {
                key = Utf8.parse(key);
            }

            // Shortcuts
            var hasherBlockSize = hasher.blockSize;
            var hasherBlockSizeBytes = hasherBlockSize * 4;

            // Allow arbitrary length keys
            if (key.sigBytes > hasherBlockSizeBytes) {
                key = hasher.finalize(key);
            }

            // Clamp excess bits
            key.clamp();

            // Clone key for inner and outer pads
            var oKey = this._oKey = key.clone();
            var iKey = this._iKey = key.clone();

            // Shortcuts
            var oKeyWords = oKey.words;
            var iKeyWords = iKey.words;

            // XOR keys with pad constants
            for (var i = 0; i < hasherBlockSize; i++) {
                oKeyWords[i] ^= 0x5c5c5c5c;
                iKeyWords[i] ^= 0x36363636;
            }
            oKey.sigBytes = iKey.sigBytes = hasherBlockSizeBytes;

            // Set initial values
            this.reset();
        },

        /**
         * Resets this HMAC to its initial state.
         *
         * @example
         *
         *     hmacHasher.reset();
         */
        reset: function () {
            // Shortcut
            var hasher = this._hasher;

            // Reset
            hasher.reset();
            hasher.update(this._iKey);
        },

        /**
         * Updates this HMAC with a message.
         *
         * @param {WordArray|string} messageUpdate The message to append.
         *
         * @return {HMAC} This HMAC instance.
         *
         * @example
         *
         *     hmacHasher.update('message');
         *     hmacHasher.update(wordArray);
         */
        update: function (messageUpdate) {
            this._hasher.update(messageUpdate);

            // Chainable
            return this;
        },

        /**
         * Finalizes the HMAC computation.
         * Note that the finalize operation is effectively a destructive, read-once operation.
         *
         * @param {WordArray|string} messageUpdate (Optional) A final message update.
         *
         * @return {WordArray} The HMAC.
         *
         * @example
         *
         *     var hmac = hmacHasher.finalize();
         *     var hmac = hmacHasher.finalize('message');
         *     var hmac = hmacHasher.finalize(wordArray);
         */
        finalize: function (messageUpdate) {
            // Shortcut
            var hasher = this._hasher;

            // Compute HMAC
            var innerHash = hasher.finalize(messageUpdate);
            hasher.reset();
            var hmac = hasher.finalize(this._oKey.clone().concat(innerHash));

            return hmac;
        }
    });
}());
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function (Math) {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var Hasher = C_lib.Hasher;
    var C_algo = C.algo;

    // Constants table
    var T = [];

    // Compute constants
    (function () {
        for (var i = 0; i < 64; i++) {
            T[i] = (Math.abs(Math.sin(i + 1)) * 0x100000000) | 0;
        }
    }());

    /**
     * MD5 hash algorithm.
     */
    var MD5 = C_algo.MD5 = Hasher.extend({
        _doReset: function () {
            this._hash = new WordArray.init([
                0x67452301, 0xefcdab89,
                0x98badcfe, 0x10325476
            ]);
        },

        _doProcessBlock: function (M, offset) {
            // Swap endian
            for (var i = 0; i < 16; i++) {
                // Shortcuts
                var offset_i = offset + i;
                var M_offset_i = M[offset_i];

                M[offset_i] = (
                    (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
                    (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
                );
            }

            // Shortcuts
            var H = this._hash.words;

            var M_offset_0  = M[offset + 0];
            var M_offset_1  = M[offset + 1];
            var M_offset_2  = M[offset + 2];
            var M_offset_3  = M[offset + 3];
            var M_offset_4  = M[offset + 4];
            var M_offset_5  = M[offset + 5];
            var M_offset_6  = M[offset + 6];
            var M_offset_7  = M[offset + 7];
            var M_offset_8  = M[offset + 8];
            var M_offset_9  = M[offset + 9];
            var M_offset_10 = M[offset + 10];
            var M_offset_11 = M[offset + 11];
            var M_offset_12 = M[offset + 12];
            var M_offset_13 = M[offset + 13];
            var M_offset_14 = M[offset + 14];
            var M_offset_15 = M[offset + 15];

            // Working varialbes
            var a = H[0];
            var b = H[1];
            var c = H[2];
            var d = H[3];

            // Computation
            a = FF(a, b, c, d, M_offset_0,  7,  T[0]);
            d = FF(d, a, b, c, M_offset_1,  12, T[1]);
            c = FF(c, d, a, b, M_offset_2,  17, T[2]);
            b = FF(b, c, d, a, M_offset_3,  22, T[3]);
            a = FF(a, b, c, d, M_offset_4,  7,  T[4]);
            d = FF(d, a, b, c, M_offset_5,  12, T[5]);
            c = FF(c, d, a, b, M_offset_6,  17, T[6]);
            b = FF(b, c, d, a, M_offset_7,  22, T[7]);
            a = FF(a, b, c, d, M_offset_8,  7,  T[8]);
            d = FF(d, a, b, c, M_offset_9,  12, T[9]);
            c = FF(c, d, a, b, M_offset_10, 17, T[10]);
            b = FF(b, c, d, a, M_offset_11, 22, T[11]);
            a = FF(a, b, c, d, M_offset_12, 7,  T[12]);
            d = FF(d, a, b, c, M_offset_13, 12, T[13]);
            c = FF(c, d, a, b, M_offset_14, 17, T[14]);
            b = FF(b, c, d, a, M_offset_15, 22, T[15]);

            a = GG(a, b, c, d, M_offset_1,  5,  T[16]);
            d = GG(d, a, b, c, M_offset_6,  9,  T[17]);
            c = GG(c, d, a, b, M_offset_11, 14, T[18]);
            b = GG(b, c, d, a, M_offset_0,  20, T[19]);
            a = GG(a, b, c, d, M_offset_5,  5,  T[20]);
            d = GG(d, a, b, c, M_offset_10, 9,  T[21]);
            c = GG(c, d, a, b, M_offset_15, 14, T[22]);
            b = GG(b, c, d, a, M_offset_4,  20, T[23]);
            a = GG(a, b, c, d, M_offset_9,  5,  T[24]);
            d = GG(d, a, b, c, M_offset_14, 9,  T[25]);
            c = GG(c, d, a, b, M_offset_3,  14, T[26]);
            b = GG(b, c, d, a, M_offset_8,  20, T[27]);
            a = GG(a, b, c, d, M_offset_13, 5,  T[28]);
            d = GG(d, a, b, c, M_offset_2,  9,  T[29]);
            c = GG(c, d, a, b, M_offset_7,  14, T[30]);
            b = GG(b, c, d, a, M_offset_12, 20, T[31]);

            a = HH(a, b, c, d, M_offset_5,  4,  T[32]);
            d = HH(d, a, b, c, M_offset_8,  11, T[33]);
            c = HH(c, d, a, b, M_offset_11, 16, T[34]);
            b = HH(b, c, d, a, M_offset_14, 23, T[35]);
            a = HH(a, b, c, d, M_offset_1,  4,  T[36]);
            d = HH(d, a, b, c, M_offset_4,  11, T[37]);
            c = HH(c, d, a, b, M_offset_7,  16, T[38]);
            b = HH(b, c, d, a, M_offset_10, 23, T[39]);
            a = HH(a, b, c, d, M_offset_13, 4,  T[40]);
            d = HH(d, a, b, c, M_offset_0,  11, T[41]);
            c = HH(c, d, a, b, M_offset_3,  16, T[42]);
            b = HH(b, c, d, a, M_offset_6,  23, T[43]);
            a = HH(a, b, c, d, M_offset_9,  4,  T[44]);
            d = HH(d, a, b, c, M_offset_12, 11, T[45]);
            c = HH(c, d, a, b, M_offset_15, 16, T[46]);
            b = HH(b, c, d, a, M_offset_2,  23, T[47]);

            a = II(a, b, c, d, M_offset_0,  6,  T[48]);
            d = II(d, a, b, c, M_offset_7,  10, T[49]);
            c = II(c, d, a, b, M_offset_14, 15, T[50]);
            b = II(b, c, d, a, M_offset_5,  21, T[51]);
            a = II(a, b, c, d, M_offset_12, 6,  T[52]);
            d = II(d, a, b, c, M_offset_3,  10, T[53]);
            c = II(c, d, a, b, M_offset_10, 15, T[54]);
            b = II(b, c, d, a, M_offset_1,  21, T[55]);
            a = II(a, b, c, d, M_offset_8,  6,  T[56]);
            d = II(d, a, b, c, M_offset_15, 10, T[57]);
            c = II(c, d, a, b, M_offset_6,  15, T[58]);
            b = II(b, c, d, a, M_offset_13, 21, T[59]);
            a = II(a, b, c, d, M_offset_4,  6,  T[60]);
            d = II(d, a, b, c, M_offset_11, 10, T[61]);
            c = II(c, d, a, b, M_offset_2,  15, T[62]);
            b = II(b, c, d, a, M_offset_9,  21, T[63]);

            // Intermediate hash value
            H[0] = (H[0] + a) | 0;
            H[1] = (H[1] + b) | 0;
            H[2] = (H[2] + c) | 0;
            H[3] = (H[3] + d) | 0;
        },

        _doFinalize: function () {
            // Shortcuts
            var data = this._data;
            var dataWords = data.words;

            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;

            // Add padding
            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);

            var nBitsTotalH = Math.floor(nBitsTotal / 0x100000000);
            var nBitsTotalL = nBitsTotal;
            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = (
                (((nBitsTotalH << 8)  | (nBitsTotalH >>> 24)) & 0x00ff00ff) |
                (((nBitsTotalH << 24) | (nBitsTotalH >>> 8))  & 0xff00ff00)
            );
            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
                (((nBitsTotalL << 8)  | (nBitsTotalL >>> 24)) & 0x00ff00ff) |
                (((nBitsTotalL << 24) | (nBitsTotalL >>> 8))  & 0xff00ff00)
            );

            data.sigBytes = (dataWords.length + 1) * 4;

            // Hash final blocks
            this._process();

            // Shortcuts
            var hash = this._hash;
            var H = hash.words;

            // Swap endian
            for (var i = 0; i < 4; i++) {
                // Shortcut
                var H_i = H[i];

                H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
                       (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
            }

            // Return final computed hash
            return hash;
        },

        clone: function () {
            var clone = Hasher.clone.call(this);
            clone._hash = this._hash.clone();

            return clone;
        }
    });

    function FF(a, b, c, d, x, s, t) {
        var n = a + ((b & c) | (~b & d)) + x + t;
        return ((n << s) | (n >>> (32 - s))) + b;
    }

    function GG(a, b, c, d, x, s, t) {
        var n = a + ((b & d) | (c & ~d)) + x + t;
        return ((n << s) | (n >>> (32 - s))) + b;
    }

    function HH(a, b, c, d, x, s, t) {
        var n = a + (b ^ c ^ d) + x + t;
        return ((n << s) | (n >>> (32 - s))) + b;
    }

    function II(a, b, c, d, x, s, t) {
        var n = a + (c ^ (b | ~d)) + x + t;
        return ((n << s) | (n >>> (32 - s))) + b;
    }

    /**
     * Shortcut function to the hasher's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     *
     * @return {WordArray} The hash.
     *
     * @static
     *
     * @example
     *
     *     var hash = CryptoJS.MD5('message');
     *     var hash = CryptoJS.MD5(wordArray);
     */
    C.MD5 = Hasher._createHelper(MD5);

    /**
     * Shortcut function to the HMAC's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     * @param {WordArray|string} key The secret key.
     *
     * @return {WordArray} The HMAC.
     *
     * @static
     *
     * @example
     *
     *     var hmac = CryptoJS.HmacMD5(message, key);
     */
    C.HmacMD5 = Hasher._createHmacHelper(MD5);
}(Math));
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function () {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var Base = C_lib.Base;
    var WordArray = C_lib.WordArray;
    var C_algo = C.algo;
    var SHA1 = C_algo.SHA1;
    var HMAC = C_algo.HMAC;

    /**
     * Password-Based Key Derivation Function 2 algorithm.
     */
    var PBKDF2 = C_algo.PBKDF2 = Base.extend({
        /**
         * Configuration options.
         *
         * @property {number} keySize The key size in words to generate. Default: 4 (128 bits)
         * @property {Hasher} hasher The hasher to use. Default: SHA1
         * @property {number} iterations The number of iterations to perform. Default: 1
         */
        cfg: Base.extend({
            keySize: 128/32,
            hasher: SHA1,
            iterations: 1
        }),

        /**
         * Initializes a newly created key derivation function.
         *
         * @param {Object} cfg (Optional) The configuration options to use for the derivation.
         *
         * @example
         *
         *     var kdf = CryptoJS.algo.PBKDF2.create();
         *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8 });
         *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8, iterations: 1000 });
         */
        init: function (cfg) {
            this.cfg = this.cfg.extend(cfg);
        },

        /**
         * Computes the Password-Based Key Derivation Function 2.
         *
         * @param {WordArray|string} password The password.
         * @param {WordArray|string} salt A salt.
         *
         * @return {WordArray} The derived key.
         *
         * @example
         *
         *     var key = kdf.compute(password, salt);
         */
        compute: function (password, salt) {
            // Shortcut
            var cfg = this.cfg;

            // Init HMAC
            var hmac = HMAC.create(cfg.hasher, password);

            // Initial values
            var derivedKey = WordArray.create();
            var blockIndex = WordArray.create([0x00000001]);

            // Shortcuts
            var derivedKeyWords = derivedKey.words;
            var blockIndexWords = blockIndex.words;
            var keySize = cfg.keySize;
            var iterations = cfg.iterations;

            // Generate key
            while (derivedKeyWords.length < keySize) {
                var block = hmac.update(salt).finalize(blockIndex);
                hmac.reset();

                // Shortcuts
                var blockWords = block.words;
                var blockWordsLength = blockWords.length;

                // Iterations
                var intermediate = block;
                for (var i = 1; i < iterations; i++) {
                    intermediate = hmac.finalize(intermediate);
                    hmac.reset();

                    // Shortcut
                    var intermediateWords = intermediate.words;

                    // XOR intermediate with block
                    for (var j = 0; j < blockWordsLength; j++) {
                        blockWords[j] ^= intermediateWords[j];
                    }
                }

                derivedKey.concat(block);
                blockIndexWords[0]++;
            }
            derivedKey.sigBytes = keySize * 4;

            return derivedKey;
        }
    });

    /**
     * Computes the Password-Based Key Derivation Function 2.
     *
     * @param {WordArray|string} password The password.
     * @param {WordArray|string} salt A salt.
     * @param {Object} cfg (Optional) The configuration options to use for this computation.
     *
     * @return {WordArray} The derived key.
     *
     * @static
     *
     * @example
     *
     *     var key = CryptoJS.PBKDF2(password, salt);
     *     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8 });
     *     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8, iterations: 1000 });
     */
    C.PBKDF2 = function (password, salt, cfg) {
        return PBKDF2.create(cfg).compute(password, salt);
    };
}());
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
/** @preserve
(c) 2012 by Cédric Mesnil. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function (Math) {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var Hasher = C_lib.Hasher;
    var C_algo = C.algo;

    // Constants table
    var _zl = WordArray.create([
        0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
        7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
        3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
        1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
        4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13]);
    var _zr = WordArray.create([
        5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
        6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
        15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
        8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
        12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11]);
    var _sl = WordArray.create([
         11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
        7, 6,   8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
        11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
          11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
        9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6 ]);
    var _sr = WordArray.create([
        8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
        9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
        9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
        15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
        8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11 ]);

    var _hl =  WordArray.create([ 0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E]);
    var _hr =  WordArray.create([ 0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000]);

    /**
     * RIPEMD160 hash algorithm.
     */
    var RIPEMD160 = C_algo.RIPEMD160 = Hasher.extend({
        _doReset: function () {
            this._hash  = WordArray.create([0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0]);
        },

        _doProcessBlock: function (M, offset) {

            // Swap endian
            for (var i = 0; i < 16; i++) {
                // Shortcuts
                var offset_i = offset + i;
                var M_offset_i = M[offset_i];

                // Swap
                M[offset_i] = (
                    (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
                    (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
                );
            }
            // Shortcut
            var H  = this._hash.words;
            var hl = _hl.words;
            var hr = _hr.words;
            var zl = _zl.words;
            var zr = _zr.words;
            var sl = _sl.words;
            var sr = _sr.words;

            // Working variables
            var al, bl, cl, dl, el;
            var ar, br, cr, dr, er;

            ar = al = H[0];
            br = bl = H[1];
            cr = cl = H[2];
            dr = dl = H[3];
            er = el = H[4];
            // Computation
            var t;
            for (var i = 0; i < 80; i += 1) {
                t = (al +  M[offset+zl[i]])|0;
                if (i<16){
	            t +=  f1(bl,cl,dl) + hl[0];
                } else if (i<32) {
	            t +=  f2(bl,cl,dl) + hl[1];
                } else if (i<48) {
	            t +=  f3(bl,cl,dl) + hl[2];
                } else if (i<64) {
	            t +=  f4(bl,cl,dl) + hl[3];
                } else {// if (i<80) {
	            t +=  f5(bl,cl,dl) + hl[4];
                }
                t = t|0;
                t =  rotl(t,sl[i]);
                t = (t+el)|0;
                al = el;
                el = dl;
                dl = rotl(cl, 10);
                cl = bl;
                bl = t;

                t = (ar + M[offset+zr[i]])|0;
                if (i<16){
	            t +=  f5(br,cr,dr) + hr[0];
                } else if (i<32) {
	            t +=  f4(br,cr,dr) + hr[1];
                } else if (i<48) {
	            t +=  f3(br,cr,dr) + hr[2];
                } else if (i<64) {
	            t +=  f2(br,cr,dr) + hr[3];
                } else {// if (i<80) {
	            t +=  f1(br,cr,dr) + hr[4];
                }
                t = t|0;
                t =  rotl(t,sr[i]) ;
                t = (t+er)|0;
                ar = er;
                er = dr;
                dr = rotl(cr, 10);
                cr = br;
                br = t;
            }
            // Intermediate hash value
            t    = (H[1] + cl + dr)|0;
            H[1] = (H[2] + dl + er)|0;
            H[2] = (H[3] + el + ar)|0;
            H[3] = (H[4] + al + br)|0;
            H[4] = (H[0] + bl + cr)|0;
            H[0] =  t;
        },

        _doFinalize: function () {
            // Shortcuts
            var data = this._data;
            var dataWords = data.words;

            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;

            // Add padding
            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
                (((nBitsTotal << 8)  | (nBitsTotal >>> 24)) & 0x00ff00ff) |
                (((nBitsTotal << 24) | (nBitsTotal >>> 8))  & 0xff00ff00)
            );
            data.sigBytes = (dataWords.length + 1) * 4;

            // Hash final blocks
            this._process();

            // Shortcuts
            var hash = this._hash;
            var H = hash.words;

            // Swap endian
            for (var i = 0; i < 5; i++) {
                // Shortcut
                var H_i = H[i];

                // Swap
                H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
                       (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
            }

            // Return final computed hash
            return hash;
        },

        clone: function () {
            var clone = Hasher.clone.call(this);
            clone._hash = this._hash.clone();

            return clone;
        }
    });


    function f1(x, y, z) {
        return ((x) ^ (y) ^ (z));

    }

    function f2(x, y, z) {
        return (((x)&(y)) | ((~x)&(z)));
    }

    function f3(x, y, z) {
        return (((x) | (~(y))) ^ (z));
    }

    function f4(x, y, z) {
        return (((x) & (z)) | ((y)&(~(z))));
    }

    function f5(x, y, z) {
        return ((x) ^ ((y) |(~(z))));

    }

    function rotl(x,n) {
        return (x<<n) | (x>>>(32-n));
    }


    /**
     * Shortcut function to the hasher's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     *
     * @return {WordArray} The hash.
     *
     * @static
     *
     * @example
     *
     *     var hash = CryptoJS.RIPEMD160('message');
     *     var hash = CryptoJS.RIPEMD160(wordArray);
     */
    C.RIPEMD160 = Hasher._createHelper(RIPEMD160);

    /**
     * Shortcut function to the HMAC's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     * @param {WordArray|string} key The secret key.
     *
     * @return {WordArray} The HMAC.
     *
     * @static
     *
     * @example
     *
     *     var hmac = CryptoJS.HmacRIPEMD160(message, key);
     */
    C.HmacRIPEMD160 = Hasher._createHmacHelper(RIPEMD160);
}(Math));
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function () {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var Hasher = C_lib.Hasher;
    var C_algo = C.algo;

    // Reusable object
    var W = [];

    /**
     * SHA-1 hash algorithm.
     */
    var SHA1 = C_algo.SHA1 = Hasher.extend({
        _doReset: function () {
            this._hash = new WordArray.init([
                0x67452301, 0xefcdab89,
                0x98badcfe, 0x10325476,
                0xc3d2e1f0
            ]);
        },

        _doProcessBlock: function (M, offset) {
            // Shortcut
            var H = this._hash.words;

            // Working variables
            var a = H[0];
            var b = H[1];
            var c = H[2];
            var d = H[3];
            var e = H[4];

            // Computation
            for (var i = 0; i < 80; i++) {
                if (i < 16) {
                    W[i] = M[offset + i] | 0;
                } else {
                    var n = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
                    W[i] = (n << 1) | (n >>> 31);
                }

                var t = ((a << 5) | (a >>> 27)) + e + W[i];
                if (i < 20) {
                    t += ((b & c) | (~b & d)) + 0x5a827999;
                } else if (i < 40) {
                    t += (b ^ c ^ d) + 0x6ed9eba1;
                } else if (i < 60) {
                    t += ((b & c) | (b & d) | (c & d)) - 0x70e44324;
                } else /* if (i < 80) */ {
                    t += (b ^ c ^ d) - 0x359d3e2a;
                }

                e = d;
                d = c;
                c = (b << 30) | (b >>> 2);
                b = a;
                a = t;
            }

            // Intermediate hash value
            H[0] = (H[0] + a) | 0;
            H[1] = (H[1] + b) | 0;
            H[2] = (H[2] + c) | 0;
            H[3] = (H[3] + d) | 0;
            H[4] = (H[4] + e) | 0;
        },

        _doFinalize: function () {
            // Shortcuts
            var data = this._data;
            var dataWords = data.words;

            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;

            // Add padding
            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
            data.sigBytes = dataWords.length * 4;

            // Hash final blocks
            this._process();

            // Return final computed hash
            return this._hash;
        },

        clone: function () {
            var clone = Hasher.clone.call(this);
            clone._hash = this._hash.clone();

            return clone;
        }
    });

    /**
     * Shortcut function to the hasher's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     *
     * @return {WordArray} The hash.
     *
     * @static
     *
     * @example
     *
     *     var hash = CryptoJS.SHA1('message');
     *     var hash = CryptoJS.SHA1(wordArray);
     */
    C.SHA1 = Hasher._createHelper(SHA1);

    /**
     * Shortcut function to the HMAC's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     * @param {WordArray|string} key The secret key.
     *
     * @return {WordArray} The HMAC.
     *
     * @static
     *
     * @example
     *
     *     var hmac = CryptoJS.HmacSHA1(message, key);
     */
    C.HmacSHA1 = Hasher._createHmacHelper(SHA1);
}());
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function (Math) {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var Hasher = C_lib.Hasher;
    var C_algo = C.algo;

    // Initialization and round constants tables
    var H = [];
    var K = [];

    // Compute constants
    (function () {
        function isPrime(n) {
            var sqrtN = Math.sqrt(n);
            for (var factor = 2; factor <= sqrtN; factor++) {
                if (!(n % factor)) {
                    return false;
                }
            }

            return true;
        }

        function getFractionalBits(n) {
            return ((n - (n | 0)) * 0x100000000) | 0;
        }

        var n = 2;
        var nPrime = 0;
        while (nPrime < 64) {
            if (isPrime(n)) {
                if (nPrime < 8) {
                    H[nPrime] = getFractionalBits(Math.pow(n, 1 / 2));
                }
                K[nPrime] = getFractionalBits(Math.pow(n, 1 / 3));

                nPrime++;
            }

            n++;
        }
    }());

    // Reusable object
    var W = [];

    /**
     * SHA-256 hash algorithm.
     */
    var SHA256 = C_algo.SHA256 = Hasher.extend({
        _doReset: function () {
            this._hash = new WordArray.init(H.slice(0));
        },

        _doProcessBlock: function (M, offset) {
            // Shortcut
            var H = this._hash.words;

            // Working variables
            var a = H[0];
            var b = H[1];
            var c = H[2];
            var d = H[3];
            var e = H[4];
            var f = H[5];
            var g = H[6];
            var h = H[7];

            // Computation
            for (var i = 0; i < 64; i++) {
                if (i < 16) {
                    W[i] = M[offset + i] | 0;
                } else {
                    var gamma0x = W[i - 15];
                    var gamma0  = ((gamma0x << 25) | (gamma0x >>> 7))  ^
                                  ((gamma0x << 14) | (gamma0x >>> 18)) ^
                                   (gamma0x >>> 3);

                    var gamma1x = W[i - 2];
                    var gamma1  = ((gamma1x << 15) | (gamma1x >>> 17)) ^
                                  ((gamma1x << 13) | (gamma1x >>> 19)) ^
                                   (gamma1x >>> 10);

                    W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
                }

                var ch  = (e & f) ^ (~e & g);
                var maj = (a & b) ^ (a & c) ^ (b & c);

                var sigma0 = ((a << 30) | (a >>> 2)) ^ ((a << 19) | (a >>> 13)) ^ ((a << 10) | (a >>> 22));
                var sigma1 = ((e << 26) | (e >>> 6)) ^ ((e << 21) | (e >>> 11)) ^ ((e << 7)  | (e >>> 25));

                var t1 = h + sigma1 + ch + K[i] + W[i];
                var t2 = sigma0 + maj;

                h = g;
                g = f;
                f = e;
                e = (d + t1) | 0;
                d = c;
                c = b;
                b = a;
                a = (t1 + t2) | 0;
            }

            // Intermediate hash value
            H[0] = (H[0] + a) | 0;
            H[1] = (H[1] + b) | 0;
            H[2] = (H[2] + c) | 0;
            H[3] = (H[3] + d) | 0;
            H[4] = (H[4] + e) | 0;
            H[5] = (H[5] + f) | 0;
            H[6] = (H[6] + g) | 0;
            H[7] = (H[7] + h) | 0;
        },

        _doFinalize: function () {
            // Shortcuts
            var data = this._data;
            var dataWords = data.words;

            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;

            // Add padding
            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
            data.sigBytes = dataWords.length * 4;

            // Hash final blocks
            this._process();

            // Return final computed hash
            return this._hash;
        },

        clone: function () {
            var clone = Hasher.clone.call(this);
            clone._hash = this._hash.clone();

            return clone;
        }
    });

    /**
     * Shortcut function to the hasher's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     *
     * @return {WordArray} The hash.
     *
     * @static
     *
     * @example
     *
     *     var hash = CryptoJS.SHA256('message');
     *     var hash = CryptoJS.SHA256(wordArray);
     */
    C.SHA256 = Hasher._createHelper(SHA256);

    /**
     * Shortcut function to the HMAC's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     * @param {WordArray|string} key The secret key.
     *
     * @return {WordArray} The HMAC.
     *
     * @static
     *
     * @example
     *
     *     var hmac = CryptoJS.HmacSHA256(message, key);
     */
    C.HmacSHA256 = Hasher._createHmacHelper(SHA256);
}(Math));
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function () {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var C_algo = C.algo;
    var SHA256 = C_algo.SHA256;

    /**
     * SHA-224 hash algorithm.
     */
    var SHA224 = C_algo.SHA224 = SHA256.extend({
        _doReset: function () {
            this._hash = new WordArray.init([
                0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
                0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4
            ]);
        },

        _doFinalize: function () {
            var hash = SHA256._doFinalize.call(this);

            hash.sigBytes -= 4;

            return hash;
        }
    });

    /**
     * Shortcut function to the hasher's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     *
     * @return {WordArray} The hash.
     *
     * @static
     *
     * @example
     *
     *     var hash = CryptoJS.SHA224('message');
     *     var hash = CryptoJS.SHA224(wordArray);
     */
    C.SHA224 = SHA256._createHelper(SHA224);

    /**
     * Shortcut function to the HMAC's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     * @param {WordArray|string} key The secret key.
     *
     * @return {WordArray} The HMAC.
     *
     * @static
     *
     * @example
     *
     *     var hmac = CryptoJS.HmacSHA224(message, key);
     */
    C.HmacSHA224 = SHA256._createHmacHelper(SHA224);
}());
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function (undefined) {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var Base = C_lib.Base;
    var X32WordArray = C_lib.WordArray;

    /**
     * x64 namespace.
     */
    var C_x64 = C.x64 = {};

    /**
     * A 64-bit word.
     */
    var X64Word = C_x64.Word = Base.extend({
        /**
         * Initializes a newly created 64-bit word.
         *
         * @param {number} high The high 32 bits.
         * @param {number} low The low 32 bits.
         *
         * @example
         *
         *     var x64Word = CryptoJS.x64.Word.create(0x00010203, 0x04050607);
         */
        init: function (high, low) {
            this.high = high;
            this.low = low;
        }

        /**
         * Bitwise NOTs this word.
         *
         * @return {X64Word} A new x64-Word object after negating.
         *
         * @example
         *
         *     var negated = x64Word.not();
         */
        // not: function () {
            // var high = ~this.high;
            // var low = ~this.low;

            // return X64Word.create(high, low);
        // },

        /**
         * Bitwise ANDs this word with the passed word.
         *
         * @param {X64Word} word The x64-Word to AND with this word.
         *
         * @return {X64Word} A new x64-Word object after ANDing.
         *
         * @example
         *
         *     var anded = x64Word.and(anotherX64Word);
         */
        // and: function (word) {
            // var high = this.high & word.high;
            // var low = this.low & word.low;

            // return X64Word.create(high, low);
        // },

        /**
         * Bitwise ORs this word with the passed word.
         *
         * @param {X64Word} word The x64-Word to OR with this word.
         *
         * @return {X64Word} A new x64-Word object after ORing.
         *
         * @example
         *
         *     var ored = x64Word.or(anotherX64Word);
         */
        // or: function (word) {
            // var high = this.high | word.high;
            // var low = this.low | word.low;

            // return X64Word.create(high, low);
        // },

        /**
         * Bitwise XORs this word with the passed word.
         *
         * @param {X64Word} word The x64-Word to XOR with this word.
         *
         * @return {X64Word} A new x64-Word object after XORing.
         *
         * @example
         *
         *     var xored = x64Word.xor(anotherX64Word);
         */
        // xor: function (word) {
            // var high = this.high ^ word.high;
            // var low = this.low ^ word.low;

            // return X64Word.create(high, low);
        // },

        /**
         * Shifts this word n bits to the left.
         *
         * @param {number} n The number of bits to shift.
         *
         * @return {X64Word} A new x64-Word object after shifting.
         *
         * @example
         *
         *     var shifted = x64Word.shiftL(25);
         */
        // shiftL: function (n) {
            // if (n < 32) {
                // var high = (this.high << n) | (this.low >>> (32 - n));
                // var low = this.low << n;
            // } else {
                // var high = this.low << (n - 32);
                // var low = 0;
            // }

            // return X64Word.create(high, low);
        // },

        /**
         * Shifts this word n bits to the right.
         *
         * @param {number} n The number of bits to shift.
         *
         * @return {X64Word} A new x64-Word object after shifting.
         *
         * @example
         *
         *     var shifted = x64Word.shiftR(7);
         */
        // shiftR: function (n) {
            // if (n < 32) {
                // var low = (this.low >>> n) | (this.high << (32 - n));
                // var high = this.high >>> n;
            // } else {
                // var low = this.high >>> (n - 32);
                // var high = 0;
            // }

            // return X64Word.create(high, low);
        // },

        /**
         * Rotates this word n bits to the left.
         *
         * @param {number} n The number of bits to rotate.
         *
         * @return {X64Word} A new x64-Word object after rotating.
         *
         * @example
         *
         *     var rotated = x64Word.rotL(25);
         */
        // rotL: function (n) {
            // return this.shiftL(n).or(this.shiftR(64 - n));
        // },

        /**
         * Rotates this word n bits to the right.
         *
         * @param {number} n The number of bits to rotate.
         *
         * @return {X64Word} A new x64-Word object after rotating.
         *
         * @example
         *
         *     var rotated = x64Word.rotR(7);
         */
        // rotR: function (n) {
            // return this.shiftR(n).or(this.shiftL(64 - n));
        // },

        /**
         * Adds this word with the passed word.
         *
         * @param {X64Word} word The x64-Word to add with this word.
         *
         * @return {X64Word} A new x64-Word object after adding.
         *
         * @example
         *
         *     var added = x64Word.add(anotherX64Word);
         */
        // add: function (word) {
            // var low = (this.low + word.low) | 0;
            // var carry = (low >>> 0) < (this.low >>> 0) ? 1 : 0;
            // var high = (this.high + word.high + carry) | 0;

            // return X64Word.create(high, low);
        // }
    });

    /**
     * An array of 64-bit words.
     *
     * @property {Array} words The array of CryptoJS.x64.Word objects.
     * @property {number} sigBytes The number of significant bytes in this word array.
     */
    var X64WordArray = C_x64.WordArray = Base.extend({
        /**
         * Initializes a newly created word array.
         *
         * @param {Array} words (Optional) An array of CryptoJS.x64.Word objects.
         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
         *
         * @example
         *
         *     var wordArray = CryptoJS.x64.WordArray.create();
         *
         *     var wordArray = CryptoJS.x64.WordArray.create([
         *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
         *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
         *     ]);
         *
         *     var wordArray = CryptoJS.x64.WordArray.create([
         *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
         *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
         *     ], 10);
         */
        init: function (words, sigBytes) {
            words = this.words = words || [];

            if (sigBytes != undefined) {
                this.sigBytes = sigBytes;
            } else {
                this.sigBytes = words.length * 8;
            }
        },

        /**
         * Converts this 64-bit word array to a 32-bit word array.
         *
         * @return {CryptoJS.lib.WordArray} This word array's data as a 32-bit word array.
         *
         * @example
         *
         *     var x32WordArray = x64WordArray.toX32();
         */
        toX32: function () {
            // Shortcuts
            var x64Words = this.words;
            var x64WordsLength = x64Words.length;

            // Convert
            var x32Words = [];
            for (var i = 0; i < x64WordsLength; i++) {
                var x64Word = x64Words[i];
                x32Words.push(x64Word.high);
                x32Words.push(x64Word.low);
            }

            return X32WordArray.create(x32Words, this.sigBytes);
        },

        /**
         * Creates a copy of this word array.
         *
         * @return {X64WordArray} The clone.
         *
         * @example
         *
         *     var clone = x64WordArray.clone();
         */
        clone: function () {
            var clone = Base.clone.call(this);

            // Clone "words" array
            var words = clone.words = this.words.slice(0);

            // Clone each X64Word object
            var wordsLength = words.length;
            for (var i = 0; i < wordsLength; i++) {
                words[i] = words[i].clone();
            }

            return clone;
        }
    });
}());
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function () {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var Hasher = C_lib.Hasher;
    var C_x64 = C.x64;
    var X64Word = C_x64.Word;
    var X64WordArray = C_x64.WordArray;
    var C_algo = C.algo;

    function X64Word_create() {
        return X64Word.create.apply(X64Word, arguments);
    }

    // Constants
    var K = [
        X64Word_create(0x428a2f98, 0xd728ae22), X64Word_create(0x71374491, 0x23ef65cd),
        X64Word_create(0xb5c0fbcf, 0xec4d3b2f), X64Word_create(0xe9b5dba5, 0x8189dbbc),
        X64Word_create(0x3956c25b, 0xf348b538), X64Word_create(0x59f111f1, 0xb605d019),
        X64Word_create(0x923f82a4, 0xaf194f9b), X64Word_create(0xab1c5ed5, 0xda6d8118),
        X64Word_create(0xd807aa98, 0xa3030242), X64Word_create(0x12835b01, 0x45706fbe),
        X64Word_create(0x243185be, 0x4ee4b28c), X64Word_create(0x550c7dc3, 0xd5ffb4e2),
        X64Word_create(0x72be5d74, 0xf27b896f), X64Word_create(0x80deb1fe, 0x3b1696b1),
        X64Word_create(0x9bdc06a7, 0x25c71235), X64Word_create(0xc19bf174, 0xcf692694),
        X64Word_create(0xe49b69c1, 0x9ef14ad2), X64Word_create(0xefbe4786, 0x384f25e3),
        X64Word_create(0x0fc19dc6, 0x8b8cd5b5), X64Word_create(0x240ca1cc, 0x77ac9c65),
        X64Word_create(0x2de92c6f, 0x592b0275), X64Word_create(0x4a7484aa, 0x6ea6e483),
        X64Word_create(0x5cb0a9dc, 0xbd41fbd4), X64Word_create(0x76f988da, 0x831153b5),
        X64Word_create(0x983e5152, 0xee66dfab), X64Word_create(0xa831c66d, 0x2db43210),
        X64Word_create(0xb00327c8, 0x98fb213f), X64Word_create(0xbf597fc7, 0xbeef0ee4),
        X64Word_create(0xc6e00bf3, 0x3da88fc2), X64Word_create(0xd5a79147, 0x930aa725),
        X64Word_create(0x06ca6351, 0xe003826f), X64Word_create(0x14292967, 0x0a0e6e70),
        X64Word_create(0x27b70a85, 0x46d22ffc), X64Word_create(0x2e1b2138, 0x5c26c926),
        X64Word_create(0x4d2c6dfc, 0x5ac42aed), X64Word_create(0x53380d13, 0x9d95b3df),
        X64Word_create(0x650a7354, 0x8baf63de), X64Word_create(0x766a0abb, 0x3c77b2a8),
        X64Word_create(0x81c2c92e, 0x47edaee6), X64Word_create(0x92722c85, 0x1482353b),
        X64Word_create(0xa2bfe8a1, 0x4cf10364), X64Word_create(0xa81a664b, 0xbc423001),
        X64Word_create(0xc24b8b70, 0xd0f89791), X64Word_create(0xc76c51a3, 0x0654be30),
        X64Word_create(0xd192e819, 0xd6ef5218), X64Word_create(0xd6990624, 0x5565a910),
        X64Word_create(0xf40e3585, 0x5771202a), X64Word_create(0x106aa070, 0x32bbd1b8),
        X64Word_create(0x19a4c116, 0xb8d2d0c8), X64Word_create(0x1e376c08, 0x5141ab53),
        X64Word_create(0x2748774c, 0xdf8eeb99), X64Word_create(0x34b0bcb5, 0xe19b48a8),
        X64Word_create(0x391c0cb3, 0xc5c95a63), X64Word_create(0x4ed8aa4a, 0xe3418acb),
        X64Word_create(0x5b9cca4f, 0x7763e373), X64Word_create(0x682e6ff3, 0xd6b2b8a3),
        X64Word_create(0x748f82ee, 0x5defb2fc), X64Word_create(0x78a5636f, 0x43172f60),
        X64Word_create(0x84c87814, 0xa1f0ab72), X64Word_create(0x8cc70208, 0x1a6439ec),
        X64Word_create(0x90befffa, 0x23631e28), X64Word_create(0xa4506ceb, 0xde82bde9),
        X64Word_create(0xbef9a3f7, 0xb2c67915), X64Word_create(0xc67178f2, 0xe372532b),
        X64Word_create(0xca273ece, 0xea26619c), X64Word_create(0xd186b8c7, 0x21c0c207),
        X64Word_create(0xeada7dd6, 0xcde0eb1e), X64Word_create(0xf57d4f7f, 0xee6ed178),
        X64Word_create(0x06f067aa, 0x72176fba), X64Word_create(0x0a637dc5, 0xa2c898a6),
        X64Word_create(0x113f9804, 0xbef90dae), X64Word_create(0x1b710b35, 0x131c471b),
        X64Word_create(0x28db77f5, 0x23047d84), X64Word_create(0x32caab7b, 0x40c72493),
        X64Word_create(0x3c9ebe0a, 0x15c9bebc), X64Word_create(0x431d67c4, 0x9c100d4c),
        X64Word_create(0x4cc5d4be, 0xcb3e42b6), X64Word_create(0x597f299c, 0xfc657e2a),
        X64Word_create(0x5fcb6fab, 0x3ad6faec), X64Word_create(0x6c44198c, 0x4a475817)
    ];

    // Reusable objects
    var W = [];
    (function () {
        for (var i = 0; i < 80; i++) {
            W[i] = X64Word_create();
        }
    }());

    /**
     * SHA-512 hash algorithm.
     */
    var SHA512 = C_algo.SHA512 = Hasher.extend({
        _doReset: function () {
            this._hash = new X64WordArray.init([
                new X64Word.init(0x6a09e667, 0xf3bcc908), new X64Word.init(0xbb67ae85, 0x84caa73b),
                new X64Word.init(0x3c6ef372, 0xfe94f82b), new X64Word.init(0xa54ff53a, 0x5f1d36f1),
                new X64Word.init(0x510e527f, 0xade682d1), new X64Word.init(0x9b05688c, 0x2b3e6c1f),
                new X64Word.init(0x1f83d9ab, 0xfb41bd6b), new X64Word.init(0x5be0cd19, 0x137e2179)
            ]);
        },

        _doProcessBlock: function (M, offset) {
            // Shortcuts
            var H = this._hash.words;

            var H0 = H[0];
            var H1 = H[1];
            var H2 = H[2];
            var H3 = H[3];
            var H4 = H[4];
            var H5 = H[5];
            var H6 = H[6];
            var H7 = H[7];

            var H0h = H0.high;
            var H0l = H0.low;
            var H1h = H1.high;
            var H1l = H1.low;
            var H2h = H2.high;
            var H2l = H2.low;
            var H3h = H3.high;
            var H3l = H3.low;
            var H4h = H4.high;
            var H4l = H4.low;
            var H5h = H5.high;
            var H5l = H5.low;
            var H6h = H6.high;
            var H6l = H6.low;
            var H7h = H7.high;
            var H7l = H7.low;

            // Working variables
            var ah = H0h;
            var al = H0l;
            var bh = H1h;
            var bl = H1l;
            var ch = H2h;
            var cl = H2l;
            var dh = H3h;
            var dl = H3l;
            var eh = H4h;
            var el = H4l;
            var fh = H5h;
            var fl = H5l;
            var gh = H6h;
            var gl = H6l;
            var hh = H7h;
            var hl = H7l;

            // Rounds
            for (var i = 0; i < 80; i++) {
                // Shortcut
                var Wi = W[i];

                // Extend message
                if (i < 16) {
                    var Wih = Wi.high = M[offset + i * 2]     | 0;
                    var Wil = Wi.low  = M[offset + i * 2 + 1] | 0;
                } else {
                    // Gamma0
                    var gamma0x  = W[i - 15];
                    var gamma0xh = gamma0x.high;
                    var gamma0xl = gamma0x.low;
                    var gamma0h  = ((gamma0xh >>> 1) | (gamma0xl << 31)) ^ ((gamma0xh >>> 8) | (gamma0xl << 24)) ^ (gamma0xh >>> 7);
                    var gamma0l  = ((gamma0xl >>> 1) | (gamma0xh << 31)) ^ ((gamma0xl >>> 8) | (gamma0xh << 24)) ^ ((gamma0xl >>> 7) | (gamma0xh << 25));

                    // Gamma1
                    var gamma1x  = W[i - 2];
                    var gamma1xh = gamma1x.high;
                    var gamma1xl = gamma1x.low;
                    var gamma1h  = ((gamma1xh >>> 19) | (gamma1xl << 13)) ^ ((gamma1xh << 3) | (gamma1xl >>> 29)) ^ (gamma1xh >>> 6);
                    var gamma1l  = ((gamma1xl >>> 19) | (gamma1xh << 13)) ^ ((gamma1xl << 3) | (gamma1xh >>> 29)) ^ ((gamma1xl >>> 6) | (gamma1xh << 26));

                    // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
                    var Wi7  = W[i - 7];
                    var Wi7h = Wi7.high;
                    var Wi7l = Wi7.low;

                    var Wi16  = W[i - 16];
                    var Wi16h = Wi16.high;
                    var Wi16l = Wi16.low;

                    var Wil = gamma0l + Wi7l;
                    var Wih = gamma0h + Wi7h + ((Wil >>> 0) < (gamma0l >>> 0) ? 1 : 0);
                    var Wil = Wil + gamma1l;
                    var Wih = Wih + gamma1h + ((Wil >>> 0) < (gamma1l >>> 0) ? 1 : 0);
                    var Wil = Wil + Wi16l;
                    var Wih = Wih + Wi16h + ((Wil >>> 0) < (Wi16l >>> 0) ? 1 : 0);

                    Wi.high = Wih;
                    Wi.low  = Wil;
                }

                var chh  = (eh & fh) ^ (~eh & gh);
                var chl  = (el & fl) ^ (~el & gl);
                var majh = (ah & bh) ^ (ah & ch) ^ (bh & ch);
                var majl = (al & bl) ^ (al & cl) ^ (bl & cl);

                var sigma0h = ((ah >>> 28) | (al << 4))  ^ ((ah << 30)  | (al >>> 2)) ^ ((ah << 25) | (al >>> 7));
                var sigma0l = ((al >>> 28) | (ah << 4))  ^ ((al << 30)  | (ah >>> 2)) ^ ((al << 25) | (ah >>> 7));
                var sigma1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9));
                var sigma1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9));

                // t1 = h + sigma1 + ch + K[i] + W[i]
                var Ki  = K[i];
                var Kih = Ki.high;
                var Kil = Ki.low;

                var t1l = hl + sigma1l;
                var t1h = hh + sigma1h + ((t1l >>> 0) < (hl >>> 0) ? 1 : 0);
                var t1l = t1l + chl;
                var t1h = t1h + chh + ((t1l >>> 0) < (chl >>> 0) ? 1 : 0);
                var t1l = t1l + Kil;
                var t1h = t1h + Kih + ((t1l >>> 0) < (Kil >>> 0) ? 1 : 0);
                var t1l = t1l + Wil;
                var t1h = t1h + Wih + ((t1l >>> 0) < (Wil >>> 0) ? 1 : 0);

                // t2 = sigma0 + maj
                var t2l = sigma0l + majl;
                var t2h = sigma0h + majh + ((t2l >>> 0) < (sigma0l >>> 0) ? 1 : 0);

                // Update working variables
                hh = gh;
                hl = gl;
                gh = fh;
                gl = fl;
                fh = eh;
                fl = el;
                el = (dl + t1l) | 0;
                eh = (dh + t1h + ((el >>> 0) < (dl >>> 0) ? 1 : 0)) | 0;
                dh = ch;
                dl = cl;
                ch = bh;
                cl = bl;
                bh = ah;
                bl = al;
                al = (t1l + t2l) | 0;
                ah = (t1h + t2h + ((al >>> 0) < (t1l >>> 0) ? 1 : 0)) | 0;
            }

            // Intermediate hash value
            H0l = H0.low  = (H0l + al);
            H0.high = (H0h + ah + ((H0l >>> 0) < (al >>> 0) ? 1 : 0));
            H1l = H1.low  = (H1l + bl);
            H1.high = (H1h + bh + ((H1l >>> 0) < (bl >>> 0) ? 1 : 0));
            H2l = H2.low  = (H2l + cl);
            H2.high = (H2h + ch + ((H2l >>> 0) < (cl >>> 0) ? 1 : 0));
            H3l = H3.low  = (H3l + dl);
            H3.high = (H3h + dh + ((H3l >>> 0) < (dl >>> 0) ? 1 : 0));
            H4l = H4.low  = (H4l + el);
            H4.high = (H4h + eh + ((H4l >>> 0) < (el >>> 0) ? 1 : 0));
            H5l = H5.low  = (H5l + fl);
            H5.high = (H5h + fh + ((H5l >>> 0) < (fl >>> 0) ? 1 : 0));
            H6l = H6.low  = (H6l + gl);
            H6.high = (H6h + gh + ((H6l >>> 0) < (gl >>> 0) ? 1 : 0));
            H7l = H7.low  = (H7l + hl);
            H7.high = (H7h + hh + ((H7l >>> 0) < (hl >>> 0) ? 1 : 0));
        },

        _doFinalize: function () {
            // Shortcuts
            var data = this._data;
            var dataWords = data.words;

            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;

            // Add padding
            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
            dataWords[(((nBitsLeft + 128) >>> 10) << 5) + 30] = Math.floor(nBitsTotal / 0x100000000);
            dataWords[(((nBitsLeft + 128) >>> 10) << 5) + 31] = nBitsTotal;
            data.sigBytes = dataWords.length * 4;

            // Hash final blocks
            this._process();

            // Convert hash to 32-bit word array before returning
            var hash = this._hash.toX32();

            // Return final computed hash
            return hash;
        },

        clone: function () {
            var clone = Hasher.clone.call(this);
            clone._hash = this._hash.clone();

            return clone;
        },

        blockSize: 1024/32
    });

    /**
     * Shortcut function to the hasher's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     *
     * @return {WordArray} The hash.
     *
     * @static
     *
     * @example
     *
     *     var hash = CryptoJS.SHA512('message');
     *     var hash = CryptoJS.SHA512(wordArray);
     */
    C.SHA512 = Hasher._createHelper(SHA512);

    /**
     * Shortcut function to the HMAC's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     * @param {WordArray|string} key The secret key.
     *
     * @return {WordArray} The HMAC.
     *
     * @static
     *
     * @example
     *
     *     var hmac = CryptoJS.HmacSHA512(message, key);
     */
    C.HmacSHA512 = Hasher._createHmacHelper(SHA512);
}());
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function () {
    // Shortcuts
    var C = CryptoJS;
    var C_x64 = C.x64;
    var X64Word = C_x64.Word;
    var X64WordArray = C_x64.WordArray;
    var C_algo = C.algo;
    var SHA512 = C_algo.SHA512;

    /**
     * SHA-384 hash algorithm.
     */
    var SHA384 = C_algo.SHA384 = SHA512.extend({
        _doReset: function () {
            this._hash = new X64WordArray.init([
                new X64Word.init(0xcbbb9d5d, 0xc1059ed8), new X64Word.init(0x629a292a, 0x367cd507),
                new X64Word.init(0x9159015a, 0x3070dd17), new X64Word.init(0x152fecd8, 0xf70e5939),
                new X64Word.init(0x67332667, 0xffc00b31), new X64Word.init(0x8eb44a87, 0x68581511),
                new X64Word.init(0xdb0c2e0d, 0x64f98fa7), new X64Word.init(0x47b5481d, 0xbefa4fa4)
            ]);
        },

        _doFinalize: function () {
            var hash = SHA512._doFinalize.call(this);

            hash.sigBytes -= 16;

            return hash;
        }
    });

    /**
     * Shortcut function to the hasher's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     *
     * @return {WordArray} The hash.
     *
     * @static
     *
     * @example
     *
     *     var hash = CryptoJS.SHA384('message');
     *     var hash = CryptoJS.SHA384(wordArray);
     */
    C.SHA384 = SHA512._createHelper(SHA384);

    /**
     * Shortcut function to the HMAC's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     * @param {WordArray|string} key The secret key.
     *
     * @return {WordArray} The HMAC.
     *
     * @static
     *
     * @example
     *
     *     var hmac = CryptoJS.HmacSHA384(message, key);
     */
    C.HmacSHA384 = SHA512._createHmacHelper(SHA384);
}());
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
(function () {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var BlockCipher = C_lib.BlockCipher;
    var C_algo = C.algo;

    // Permuted Choice 1 constants
    var PC1 = [
        57, 49, 41, 33, 25, 17, 9,  1,
        58, 50, 42, 34, 26, 18, 10, 2,
        59, 51, 43, 35, 27, 19, 11, 3,
        60, 52, 44, 36, 63, 55, 47, 39,
        31, 23, 15, 7,  62, 54, 46, 38,
        30, 22, 14, 6,  61, 53, 45, 37,
        29, 21, 13, 5,  28, 20, 12, 4
    ];

    // Permuted Choice 2 constants
    var PC2 = [
        14, 17, 11, 24, 1,  5,
        3,  28, 15, 6,  21, 10,
        23, 19, 12, 4,  26, 8,
        16, 7,  27, 20, 13, 2,
        41, 52, 31, 37, 47, 55,
        30, 40, 51, 45, 33, 48,
        44, 49, 39, 56, 34, 53,
        46, 42, 50, 36, 29, 32
    ];

    // Cumulative bit shift constants
    var BIT_SHIFTS = [1,  2,  4,  6,  8,  10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28];

    // SBOXes and round permutation constants
    var SBOX_P = [
        {
            0x0: 0x808200,
            0x10000000: 0x8000,
            0x20000000: 0x808002,
            0x30000000: 0x2,
            0x40000000: 0x200,
            0x50000000: 0x808202,
            0x60000000: 0x800202,
            0x70000000: 0x800000,
            0x80000000: 0x202,
            0x90000000: 0x800200,
            0xa0000000: 0x8200,
            0xb0000000: 0x808000,
            0xc0000000: 0x8002,
            0xd0000000: 0x800002,
            0xe0000000: 0x0,
            0xf0000000: 0x8202,
            0x8000000: 0x0,
            0x18000000: 0x808202,
            0x28000000: 0x8202,
            0x38000000: 0x8000,
            0x48000000: 0x808200,
            0x58000000: 0x200,
            0x68000000: 0x808002,
            0x78000000: 0x2,
            0x88000000: 0x800200,
            0x98000000: 0x8200,
            0xa8000000: 0x808000,
            0xb8000000: 0x800202,
            0xc8000000: 0x800002,
            0xd8000000: 0x8002,
            0xe8000000: 0x202,
            0xf8000000: 0x800000,
            0x1: 0x8000,
            0x10000001: 0x2,
            0x20000001: 0x808200,
            0x30000001: 0x800000,
            0x40000001: 0x808002,
            0x50000001: 0x8200,
            0x60000001: 0x200,
            0x70000001: 0x800202,
            0x80000001: 0x808202,
            0x90000001: 0x808000,
            0xa0000001: 0x800002,
            0xb0000001: 0x8202,
            0xc0000001: 0x202,
            0xd0000001: 0x800200,
            0xe0000001: 0x8002,
            0xf0000001: 0x0,
            0x8000001: 0x808202,
            0x18000001: 0x808000,
            0x28000001: 0x800000,
            0x38000001: 0x200,
            0x48000001: 0x8000,
            0x58000001: 0x800002,
            0x68000001: 0x2,
            0x78000001: 0x8202,
            0x88000001: 0x8002,
            0x98000001: 0x800202,
            0xa8000001: 0x202,
            0xb8000001: 0x808200,
            0xc8000001: 0x800200,
            0xd8000001: 0x0,
            0xe8000001: 0x8200,
            0xf8000001: 0x808002
        },
        {
            0x0: 0x40084010,
            0x1000000: 0x4000,
            0x2000000: 0x80000,
            0x3000000: 0x40080010,
            0x4000000: 0x40000010,
            0x5000000: 0x40084000,
            0x6000000: 0x40004000,
            0x7000000: 0x10,
            0x8000000: 0x84000,
            0x9000000: 0x40004010,
            0xa000000: 0x40000000,
            0xb000000: 0x84010,
            0xc000000: 0x80010,
            0xd000000: 0x0,
            0xe000000: 0x4010,
            0xf000000: 0x40080000,
            0x800000: 0x40004000,
            0x1800000: 0x84010,
            0x2800000: 0x10,
            0x3800000: 0x40004010,
            0x4800000: 0x40084010,
            0x5800000: 0x40000000,
            0x6800000: 0x80000,
            0x7800000: 0x40080010,
            0x8800000: 0x80010,
            0x9800000: 0x0,
            0xa800000: 0x4000,
            0xb800000: 0x40080000,
            0xc800000: 0x40000010,
            0xd800000: 0x84000,
            0xe800000: 0x40084000,
            0xf800000: 0x4010,
            0x10000000: 0x0,
            0x11000000: 0x40080010,
            0x12000000: 0x40004010,
            0x13000000: 0x40084000,
            0x14000000: 0x40080000,
            0x15000000: 0x10,
            0x16000000: 0x84010,
            0x17000000: 0x4000,
            0x18000000: 0x4010,
            0x19000000: 0x80000,
            0x1a000000: 0x80010,
            0x1b000000: 0x40000010,
            0x1c000000: 0x84000,
            0x1d000000: 0x40004000,
            0x1e000000: 0x40000000,
            0x1f000000: 0x40084010,
            0x10800000: 0x84010,
            0x11800000: 0x80000,
            0x12800000: 0x40080000,
            0x13800000: 0x4000,
            0x14800000: 0x40004000,
            0x15800000: 0x40084010,
            0x16800000: 0x10,
            0x17800000: 0x40000000,
            0x18800000: 0x40084000,
            0x19800000: 0x40000010,
            0x1a800000: 0x40004010,
            0x1b800000: 0x80010,
            0x1c800000: 0x0,
            0x1d800000: 0x4010,
            0x1e800000: 0x40080010,
            0x1f800000: 0x84000
        },
        {
            0x0: 0x104,
            0x100000: 0x0,
            0x200000: 0x4000100,
            0x300000: 0x10104,
            0x400000: 0x10004,
            0x500000: 0x4000004,
            0x600000: 0x4010104,
            0x700000: 0x4010000,
            0x800000: 0x4000000,
            0x900000: 0x4010100,
            0xa00000: 0x10100,
            0xb00000: 0x4010004,
            0xc00000: 0x4000104,
            0xd00000: 0x10000,
            0xe00000: 0x4,
            0xf00000: 0x100,
            0x80000: 0x4010100,
            0x180000: 0x4010004,
            0x280000: 0x0,
            0x380000: 0x4000100,
            0x480000: 0x4000004,
            0x580000: 0x10000,
            0x680000: 0x10004,
            0x780000: 0x104,
            0x880000: 0x4,
            0x980000: 0x100,
            0xa80000: 0x4010000,
            0xb80000: 0x10104,
            0xc80000: 0x10100,
            0xd80000: 0x4000104,
            0xe80000: 0x4010104,
            0xf80000: 0x4000000,
            0x1000000: 0x4010100,
            0x1100000: 0x10004,
            0x1200000: 0x10000,
            0x1300000: 0x4000100,
            0x1400000: 0x100,
            0x1500000: 0x4010104,
            0x1600000: 0x4000004,
            0x1700000: 0x0,
            0x1800000: 0x4000104,
            0x1900000: 0x4000000,
            0x1a00000: 0x4,
            0x1b00000: 0x10100,
            0x1c00000: 0x4010000,
            0x1d00000: 0x104,
            0x1e00000: 0x10104,
            0x1f00000: 0x4010004,
            0x1080000: 0x4000000,
            0x1180000: 0x104,
            0x1280000: 0x4010100,
            0x1380000: 0x0,
            0x1480000: 0x10004,
            0x1580000: 0x4000100,
            0x1680000: 0x100,
            0x1780000: 0x4010004,
            0x1880000: 0x10000,
            0x1980000: 0x4010104,
            0x1a80000: 0x10104,
            0x1b80000: 0x4000004,
            0x1c80000: 0x4000104,
            0x1d80000: 0x4010000,
            0x1e80000: 0x4,
            0x1f80000: 0x10100
        },
        {
            0x0: 0x80401000,
            0x10000: 0x80001040,
            0x20000: 0x401040,
            0x30000: 0x80400000,
            0x40000: 0x0,
            0x50000: 0x401000,
            0x60000: 0x80000040,
            0x70000: 0x400040,
            0x80000: 0x80000000,
            0x90000: 0x400000,
            0xa0000: 0x40,
            0xb0000: 0x80001000,
            0xc0000: 0x80400040,
            0xd0000: 0x1040,
            0xe0000: 0x1000,
            0xf0000: 0x80401040,
            0x8000: 0x80001040,
            0x18000: 0x40,
            0x28000: 0x80400040,
            0x38000: 0x80001000,
            0x48000: 0x401000,
            0x58000: 0x80401040,
            0x68000: 0x0,
            0x78000: 0x80400000,
            0x88000: 0x1000,
            0x98000: 0x80401000,
            0xa8000: 0x400000,
            0xb8000: 0x1040,
            0xc8000: 0x80000000,
            0xd8000: 0x400040,
            0xe8000: 0x401040,
            0xf8000: 0x80000040,
            0x100000: 0x400040,
            0x110000: 0x401000,
            0x120000: 0x80000040,
            0x130000: 0x0,
            0x140000: 0x1040,
            0x150000: 0x80400040,
            0x160000: 0x80401000,
            0x170000: 0x80001040,
            0x180000: 0x80401040,
            0x190000: 0x80000000,
            0x1a0000: 0x80400000,
            0x1b0000: 0x401040,
            0x1c0000: 0x80001000,
            0x1d0000: 0x400000,
            0x1e0000: 0x40,
            0x1f0000: 0x1000,
            0x108000: 0x80400000,
            0x118000: 0x80401040,
            0x128000: 0x0,
            0x138000: 0x401000,
            0x148000: 0x400040,
            0x158000: 0x80000000,
            0x168000: 0x80001040,
            0x178000: 0x40,
            0x188000: 0x80000040,
            0x198000: 0x1000,
            0x1a8000: 0x80001000,
            0x1b8000: 0x80400040,
            0x1c8000: 0x1040,
            0x1d8000: 0x80401000,
            0x1e8000: 0x400000,
            0x1f8000: 0x401040
        },
        {
            0x0: 0x80,
            0x1000: 0x1040000,
            0x2000: 0x40000,
            0x3000: 0x20000000,
            0x4000: 0x20040080,
            0x5000: 0x1000080,
            0x6000: 0x21000080,
            0x7000: 0x40080,
            0x8000: 0x1000000,
            0x9000: 0x20040000,
            0xa000: 0x20000080,
            0xb000: 0x21040080,
            0xc000: 0x21040000,
            0xd000: 0x0,
            0xe000: 0x1040080,
            0xf000: 0x21000000,
            0x800: 0x1040080,
            0x1800: 0x21000080,
            0x2800: 0x80,
            0x3800: 0x1040000,
            0x4800: 0x40000,
            0x5800: 0x20040080,
            0x6800: 0x21040000,
            0x7800: 0x20000000,
            0x8800: 0x20040000,
            0x9800: 0x0,
            0xa800: 0x21040080,
            0xb800: 0x1000080,
            0xc800: 0x20000080,
            0xd800: 0x21000000,
            0xe800: 0x1000000,
            0xf800: 0x40080,
            0x10000: 0x40000,
            0x11000: 0x80,
            0x12000: 0x20000000,
            0x13000: 0x21000080,
            0x14000: 0x1000080,
            0x15000: 0x21040000,
            0x16000: 0x20040080,
            0x17000: 0x1000000,
            0x18000: 0x21040080,
            0x19000: 0x21000000,
            0x1a000: 0x1040000,
            0x1b000: 0x20040000,
            0x1c000: 0x40080,
            0x1d000: 0x20000080,
            0x1e000: 0x0,
            0x1f000: 0x1040080,
            0x10800: 0x21000080,
            0x11800: 0x1000000,
            0x12800: 0x1040000,
            0x13800: 0x20040080,
            0x14800: 0x20000000,
            0x15800: 0x1040080,
            0x16800: 0x80,
            0x17800: 0x21040000,
            0x18800: 0x40080,
            0x19800: 0x21040080,
            0x1a800: 0x0,
            0x1b800: 0x21000000,
            0x1c800: 0x1000080,
            0x1d800: 0x40000,
            0x1e800: 0x20040000,
            0x1f800: 0x20000080
        },
        {
            0x0: 0x10000008,
            0x100: 0x2000,
            0x200: 0x10200000,
            0x300: 0x10202008,
            0x400: 0x10002000,
            0x500: 0x200000,
            0x600: 0x200008,
            0x700: 0x10000000,
            0x800: 0x0,
            0x900: 0x10002008,
            0xa00: 0x202000,
            0xb00: 0x8,
            0xc00: 0x10200008,
            0xd00: 0x202008,
            0xe00: 0x2008,
            0xf00: 0x10202000,
            0x80: 0x10200000,
            0x180: 0x10202008,
            0x280: 0x8,
            0x380: 0x200000,
            0x480: 0x202008,
            0x580: 0x10000008,
            0x680: 0x10002000,
            0x780: 0x2008,
            0x880: 0x200008,
            0x980: 0x2000,
            0xa80: 0x10002008,
            0xb80: 0x10200008,
            0xc80: 0x0,
            0xd80: 0x10202000,
            0xe80: 0x202000,
            0xf80: 0x10000000,
            0x1000: 0x10002000,
            0x1100: 0x10200008,
            0x1200: 0x10202008,
            0x1300: 0x2008,
            0x1400: 0x200000,
            0x1500: 0x10000000,
            0x1600: 0x10000008,
            0x1700: 0x202000,
            0x1800: 0x202008,
            0x1900: 0x0,
            0x1a00: 0x8,
            0x1b00: 0x10200000,
            0x1c00: 0x2000,
            0x1d00: 0x10002008,
            0x1e00: 0x10202000,
            0x1f00: 0x200008,
            0x1080: 0x8,
            0x1180: 0x202000,
            0x1280: 0x200000,
            0x1380: 0x10000008,
            0x1480: 0x10002000,
            0x1580: 0x2008,
            0x1680: 0x10202008,
            0x1780: 0x10200000,
            0x1880: 0x10202000,
            0x1980: 0x10200008,
            0x1a80: 0x2000,
            0x1b80: 0x202008,
            0x1c80: 0x200008,
            0x1d80: 0x0,
            0x1e80: 0x10000000,
            0x1f80: 0x10002008
        },
        {
            0x0: 0x100000,
            0x10: 0x2000401,
            0x20: 0x400,
            0x30: 0x100401,
            0x40: 0x2100401,
            0x50: 0x0,
            0x60: 0x1,
            0x70: 0x2100001,
            0x80: 0x2000400,
            0x90: 0x100001,
            0xa0: 0x2000001,
            0xb0: 0x2100400,
            0xc0: 0x2100000,
            0xd0: 0x401,
            0xe0: 0x100400,
            0xf0: 0x2000000,
            0x8: 0x2100001,
            0x18: 0x0,
            0x28: 0x2000401,
            0x38: 0x2100400,
            0x48: 0x100000,
            0x58: 0x2000001,
            0x68: 0x2000000,
            0x78: 0x401,
            0x88: 0x100401,
            0x98: 0x2000400,
            0xa8: 0x2100000,
            0xb8: 0x100001,
            0xc8: 0x400,
            0xd8: 0x2100401,
            0xe8: 0x1,
            0xf8: 0x100400,
            0x100: 0x2000000,
            0x110: 0x100000,
            0x120: 0x2000401,
            0x130: 0x2100001,
            0x140: 0x100001,
            0x150: 0x2000400,
            0x160: 0x2100400,
            0x170: 0x100401,
            0x180: 0x401,
            0x190: 0x2100401,
            0x1a0: 0x100400,
            0x1b0: 0x1,
            0x1c0: 0x0,
            0x1d0: 0x2100000,
            0x1e0: 0x2000001,
            0x1f0: 0x400,
            0x108: 0x100400,
            0x118: 0x2000401,
            0x128: 0x2100001,
            0x138: 0x1,
            0x148: 0x2000000,
            0x158: 0x100000,
            0x168: 0x401,
            0x178: 0x2100400,
            0x188: 0x2000001,
            0x198: 0x2100000,
            0x1a8: 0x0,
            0x1b8: 0x2100401,
            0x1c8: 0x100401,
            0x1d8: 0x400,
            0x1e8: 0x2000400,
            0x1f8: 0x100001
        },
        {
            0x0: 0x8000820,
            0x1: 0x20000,
            0x2: 0x8000000,
            0x3: 0x20,
            0x4: 0x20020,
            0x5: 0x8020820,
            0x6: 0x8020800,
            0x7: 0x800,
            0x8: 0x8020000,
            0x9: 0x8000800,
            0xa: 0x20800,
            0xb: 0x8020020,
            0xc: 0x820,
            0xd: 0x0,
            0xe: 0x8000020,
            0xf: 0x20820,
            0x80000000: 0x800,
            0x80000001: 0x8020820,
            0x80000002: 0x8000820,
            0x80000003: 0x8000000,
            0x80000004: 0x8020000,
            0x80000005: 0x20800,
            0x80000006: 0x20820,
            0x80000007: 0x20,
            0x80000008: 0x8000020,
            0x80000009: 0x820,
            0x8000000a: 0x20020,
            0x8000000b: 0x8020800,
            0x8000000c: 0x0,
            0x8000000d: 0x8020020,
            0x8000000e: 0x8000800,
            0x8000000f: 0x20000,
            0x10: 0x20820,
            0x11: 0x8020800,
            0x12: 0x20,
            0x13: 0x800,
            0x14: 0x8000800,
            0x15: 0x8000020,
            0x16: 0x8020020,
            0x17: 0x20000,
            0x18: 0x0,
            0x19: 0x20020,
            0x1a: 0x8020000,
            0x1b: 0x8000820,
            0x1c: 0x8020820,
            0x1d: 0x20800,
            0x1e: 0x820,
            0x1f: 0x8000000,
            0x80000010: 0x20000,
            0x80000011: 0x800,
            0x80000012: 0x8020020,
            0x80000013: 0x20820,
            0x80000014: 0x20,
            0x80000015: 0x8020000,
            0x80000016: 0x8000000,
            0x80000017: 0x8000820,
            0x80000018: 0x8020820,
            0x80000019: 0x8000020,
            0x8000001a: 0x8000800,
            0x8000001b: 0x0,
            0x8000001c: 0x20800,
            0x8000001d: 0x820,
            0x8000001e: 0x20020,
            0x8000001f: 0x8020800
        }
    ];

    // Masks that select the SBOX input
    var SBOX_MASK = [
        0xf8000001, 0x1f800000, 0x01f80000, 0x001f8000,
        0x0001f800, 0x00001f80, 0x000001f8, 0x8000001f
    ];

    /**
     * DES block cipher algorithm.
     */
    var DES = C_algo.DES = BlockCipher.extend({
        _doReset: function () {
            // Shortcuts
            var key = this._key;
            var keyWords = key.words;

            // Select 56 bits according to PC1
            var keyBits = [];
            for (var i = 0; i < 56; i++) {
                var keyBitPos = PC1[i] - 1;
                keyBits[i] = (keyWords[keyBitPos >>> 5] >>> (31 - keyBitPos % 32)) & 1;
            }

            // Assemble 16 subkeys
            var subKeys = this._subKeys = [];
            for (var nSubKey = 0; nSubKey < 16; nSubKey++) {
                // Create subkey
                var subKey = subKeys[nSubKey] = [];

                // Shortcut
                var bitShift = BIT_SHIFTS[nSubKey];

                // Select 48 bits according to PC2
                for (var i = 0; i < 24; i++) {
                    // Select from the left 28 key bits
                    subKey[(i / 6) | 0] |= keyBits[((PC2[i] - 1) + bitShift) % 28] << (31 - i % 6);

                    // Select from the right 28 key bits
                    subKey[4 + ((i / 6) | 0)] |= keyBits[28 + (((PC2[i + 24] - 1) + bitShift) % 28)] << (31 - i % 6);
                }

                // Since each subkey is applied to an expanded 32-bit input,
                // the subkey can be broken into 8 values scaled to 32-bits,
                // which allows the key to be used without expansion
                subKey[0] = (subKey[0] << 1) | (subKey[0] >>> 31);
                for (var i = 1; i < 7; i++) {
                    subKey[i] = subKey[i] >>> ((i - 1) * 4 + 3);
                }
                subKey[7] = (subKey[7] << 5) | (subKey[7] >>> 27);
            }

            // Compute inverse subkeys
            var invSubKeys = this._invSubKeys = [];
            for (var i = 0; i < 16; i++) {
                invSubKeys[i] = subKeys[15 - i];
            }
        },

        encryptBlock: function (M, offset) {
            this._doCryptBlock(M, offset, this._subKeys);
        },

        decryptBlock: function (M, offset) {
            this._doCryptBlock(M, offset, this._invSubKeys);
        },

        _doCryptBlock: function (M, offset, subKeys) {
            // Get input
            this._lBlock = M[offset];
            this._rBlock = M[offset + 1];

            // Initial permutation
            exchangeLR.call(this, 4,  0x0f0f0f0f);
            exchangeLR.call(this, 16, 0x0000ffff);
            exchangeRL.call(this, 2,  0x33333333);
            exchangeRL.call(this, 8,  0x00ff00ff);
            exchangeLR.call(this, 1,  0x55555555);

            // Rounds
            for (var round = 0; round < 16; round++) {
                // Shortcuts
                var subKey = subKeys[round];
                var lBlock = this._lBlock;
                var rBlock = this._rBlock;

                // Feistel function
                var f = 0;
                for (var i = 0; i < 8; i++) {
                    f |= SBOX_P[i][((rBlock ^ subKey[i]) & SBOX_MASK[i]) >>> 0];
                }
                this._lBlock = rBlock;
                this._rBlock = lBlock ^ f;
            }

            // Undo swap from last round
            var t = this._lBlock;
            this._lBlock = this._rBlock;
            this._rBlock = t;

            // Final permutation
            exchangeLR.call(this, 1,  0x55555555);
            exchangeRL.call(this, 8,  0x00ff00ff);
            exchangeRL.call(this, 2,  0x33333333);
            exchangeLR.call(this, 16, 0x0000ffff);
            exchangeLR.call(this, 4,  0x0f0f0f0f);

            // Set output
            M[offset] = this._lBlock;
            M[offset + 1] = this._rBlock;
        },

        keySize: 64/32,

        ivSize: 64/32,

        blockSize: 64/32
    });

    // Swap bits across the left and right words
    function exchangeLR(offset, mask) {
        var t = ((this._lBlock >>> offset) ^ this._rBlock) & mask;
        this._rBlock ^= t;
        this._lBlock ^= t << offset;
    }

    function exchangeRL(offset, mask) {
        var t = ((this._rBlock >>> offset) ^ this._lBlock) & mask;
        this._lBlock ^= t;
        this._rBlock ^= t << offset;
    }

    /**
     * Shortcut functions to the cipher's object interface.
     *
     * @example
     *
     *     var ciphertext = CryptoJS.DES.encrypt(message, key, cfg);
     *     var plaintext  = CryptoJS.DES.decrypt(ciphertext, key, cfg);
     */
    C.DES = BlockCipher._createHelper(DES);

    /**
     * Triple-DES block cipher algorithm.
     */
    var TripleDES = C_algo.TripleDES = BlockCipher.extend({
        _doReset: function () {
            // Shortcuts
            var key = this._key;
            var keyWords = key.words;

            // Create DES instances
            this._des1 = DES.createEncryptor(WordArray.create(keyWords.slice(0, 2)));
            this._des2 = DES.createEncryptor(WordArray.create(keyWords.slice(2, 4)));
            this._des3 = DES.createEncryptor(WordArray.create(keyWords.slice(4, 6)));
        },

        encryptBlock: function (M, offset) {
            this._des1.encryptBlock(M, offset);
            this._des2.decryptBlock(M, offset);
            this._des3.encryptBlock(M, offset);
        },

        decryptBlock: function (M, offset) {
            this._des3.decryptBlock(M, offset);
            this._des2.encryptBlock(M, offset);
            this._des1.decryptBlock(M, offset);
        },

        keySize: 192/32,

        ivSize: 64/32,

        blockSize: 64/32
    });

    /**
     * Shortcut functions to the cipher's object interface.
     *
     * @example
     *
     *     var ciphertext = CryptoJS.TripleDES.encrypt(message, key, cfg);
     *     var plaintext  = CryptoJS.TripleDES.decrypt(ciphertext, key, cfg);
     */
    C.TripleDES = BlockCipher._createHelper(TripleDES);
}());
/*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
 */
var b64map="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var b64pad="=";

function hex2b64(h) {
  var i;
  var c;
  var ret = "";
  for(i = 0; i+3 <= h.length; i+=3) {
    c = parseInt(h.substring(i,i+3),16);
    ret += b64map.charAt(c >> 6) + b64map.charAt(c & 63);
  }
  if(i+1 == h.length) {
    c = parseInt(h.substring(i,i+1),16);
    ret += b64map.charAt(c << 2);
  }
  else if(i+2 == h.length) {
    c = parseInt(h.substring(i,i+2),16);
    ret += b64map.charAt(c >> 2) + b64map.charAt((c & 3) << 4);
  }
  if (b64pad) while((ret.length & 3) > 0) ret += b64pad;
  return ret;
}

// convert a base64 string to hex
function b64tohex(s) {
  var ret = ""
  var i;
  var k = 0; // b64 state, 0-3
  var slop;
  var v;
  for(i = 0; i < s.length; ++i) {
    if(s.charAt(i) == b64pad) break;
    v = b64map.indexOf(s.charAt(i));
    if(v < 0) continue;
    if(k == 0) {
      ret += int2char(v >> 2);
      slop = v & 3;
      k = 1;
    }
    else if(k == 1) {
      ret += int2char((slop << 2) | (v >> 4));
      slop = v & 0xf;
      k = 2;
    }
    else if(k == 2) {
      ret += int2char(slop);
      ret += int2char(v >> 2);
      slop = v & 3;
      k = 3;
    }
    else {
      ret += int2char((slop << 2) | (v >> 4));
      ret += int2char(v & 0xf);
      k = 0;
    }
  }
  if(k == 1)
    ret += int2char(slop << 2);
  return ret;
}

// convert a base64 string to a byte/number array
function b64toBA(s) {
  //piggyback on b64tohex for now, optimize later
  var h = b64tohex(s);
  var i;
  var a = new Array();
  for(i = 0; 2*i < h.length; ++i) {
    a[i] = parseInt(h.substring(2*i,2*i+2),16);
  }
  return a;
}
/*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
 */
// Basic Javascript Elliptic Curve implementation
// Ported loosely from BouncyCastle's Java EC code
// Only Fp curves implemented for now

// Requires jsbn.js and jsbn2.js

// ----------------
// ECFieldElementFp

// constructor
function ECFieldElementFp(q,x) {
    this.x = x;
    // TODO if(x.compareTo(q) >= 0) error
    this.q = q;
}

function feFpEquals(other) {
    if(other == this) return true;
    return (this.q.equals(other.q) && this.x.equals(other.x));
}

function feFpToBigInteger() {
    return this.x;
}

function feFpNegate() {
    return new ECFieldElementFp(this.q, this.x.negate().mod(this.q));
}

function feFpAdd(b) {
    return new ECFieldElementFp(this.q, this.x.add(b.toBigInteger()).mod(this.q));
}

function feFpSubtract(b) {
    return new ECFieldElementFp(this.q, this.x.subtract(b.toBigInteger()).mod(this.q));
}

function feFpMultiply(b) {
    return new ECFieldElementFp(this.q, this.x.multiply(b.toBigInteger()).mod(this.q));
}

function feFpSquare() {
    return new ECFieldElementFp(this.q, this.x.square().mod(this.q));
}

function feFpDivide(b) {
    return new ECFieldElementFp(this.q, this.x.multiply(b.toBigInteger().modInverse(this.q)).mod(this.q));
}

ECFieldElementFp.prototype.equals = feFpEquals;
ECFieldElementFp.prototype.toBigInteger = feFpToBigInteger;
ECFieldElementFp.prototype.negate = feFpNegate;
ECFieldElementFp.prototype.add = feFpAdd;
ECFieldElementFp.prototype.subtract = feFpSubtract;
ECFieldElementFp.prototype.multiply = feFpMultiply;
ECFieldElementFp.prototype.square = feFpSquare;
ECFieldElementFp.prototype.divide = feFpDivide;

// ----------------
// ECPointFp

// constructor
function ECPointFp(curve,x,y,z) {
    this.curve = curve;
    this.x = x;
    this.y = y;
    // Projective coordinates: either zinv == null or z * zinv == 1
    // z and zinv are just BigIntegers, not fieldElements
    if(z == null) {
      this.z = BigInteger.ONE;
    }
    else {
      this.z = z;
    }
    this.zinv = null;
    //TODO: compression flag
}

function pointFpGetX() {
    if(this.zinv == null) {
      this.zinv = this.z.modInverse(this.curve.q);
    }
    return this.curve.fromBigInteger(this.x.toBigInteger().multiply(this.zinv).mod(this.curve.q));
}

function pointFpGetY() {
    if(this.zinv == null) {
      this.zinv = this.z.modInverse(this.curve.q);
    }
    return this.curve.fromBigInteger(this.y.toBigInteger().multiply(this.zinv).mod(this.curve.q));
}

function pointFpEquals(other) {
    if(other == this) return true;
    if(this.isInfinity()) return other.isInfinity();
    if(other.isInfinity()) return this.isInfinity();
    var u, v;
    // u = Y2 * Z1 - Y1 * Z2
    u = other.y.toBigInteger().multiply(this.z).subtract(this.y.toBigInteger().multiply(other.z)).mod(this.curve.q);
    if(!u.equals(BigInteger.ZERO)) return false;
    // v = X2 * Z1 - X1 * Z2
    v = other.x.toBigInteger().multiply(this.z).subtract(this.x.toBigInteger().multiply(other.z)).mod(this.curve.q);
    return v.equals(BigInteger.ZERO);
}

function pointFpIsInfinity() {
    if((this.x == null) && (this.y == null)) return true;
    return this.z.equals(BigInteger.ZERO) && !this.y.toBigInteger().equals(BigInteger.ZERO);
}

function pointFpNegate() {
    return new ECPointFp(this.curve, this.x, this.y.negate(), this.z);
}

function pointFpAdd(b) {
    if(this.isInfinity()) return b;
    if(b.isInfinity()) return this;

    // u = Y2 * Z1 - Y1 * Z2
    var u = b.y.toBigInteger().multiply(this.z).subtract(this.y.toBigInteger().multiply(b.z)).mod(this.curve.q);
    // v = X2 * Z1 - X1 * Z2
    var v = b.x.toBigInteger().multiply(this.z).subtract(this.x.toBigInteger().multiply(b.z)).mod(this.curve.q);

    if(BigInteger.ZERO.equals(v)) {
        if(BigInteger.ZERO.equals(u)) {
            return this.twice(); // this == b, so double
        }
	return this.curve.getInfinity(); // this = -b, so infinity
    }

    var THREE = new BigInteger("3");
    var x1 = this.x.toBigInteger();
    var y1 = this.y.toBigInteger();
    var x2 = b.x.toBigInteger();
    var y2 = b.y.toBigInteger();

    var v2 = v.square();
    var v3 = v2.multiply(v);
    var x1v2 = x1.multiply(v2);
    var zu2 = u.square().multiply(this.z);

    // x3 = v * (z2 * (z1 * u^2 - 2 * x1 * v^2) - v^3)
    var x3 = zu2.subtract(x1v2.shiftLeft(1)).multiply(b.z).subtract(v3).multiply(v).mod(this.curve.q);
    // y3 = z2 * (3 * x1 * u * v^2 - y1 * v^3 - z1 * u^3) + u * v^3
    var y3 = x1v2.multiply(THREE).multiply(u).subtract(y1.multiply(v3)).subtract(zu2.multiply(u)).multiply(b.z).add(u.multiply(v3)).mod(this.curve.q);
    // z3 = v^3 * z1 * z2
    var z3 = v3.multiply(this.z).multiply(b.z).mod(this.curve.q);

    return new ECPointFp(this.curve, this.curve.fromBigInteger(x3), this.curve.fromBigInteger(y3), z3);
}

function pointFpTwice() {
    if(this.isInfinity()) return this;
    if(this.y.toBigInteger().signum() == 0) return this.curve.getInfinity();

    // TODO: optimized handling of constants
    var THREE = new BigInteger("3");
    var x1 = this.x.toBigInteger();
    var y1 = this.y.toBigInteger();

    var y1z1 = y1.multiply(this.z);
    var y1sqz1 = y1z1.multiply(y1).mod(this.curve.q);
    var a = this.curve.a.toBigInteger();

    // w = 3 * x1^2 + a * z1^2
    var w = x1.square().multiply(THREE);
    if(!BigInteger.ZERO.equals(a)) {
      w = w.add(this.z.square().multiply(a));
    }
    w = w.mod(this.curve.q);
    // x3 = 2 * y1 * z1 * (w^2 - 8 * x1 * y1^2 * z1)
    var x3 = w.square().subtract(x1.shiftLeft(3).multiply(y1sqz1)).shiftLeft(1).multiply(y1z1).mod(this.curve.q);
    // y3 = 4 * y1^2 * z1 * (3 * w * x1 - 2 * y1^2 * z1) - w^3
    var y3 = w.multiply(THREE).multiply(x1).subtract(y1sqz1.shiftLeft(1)).shiftLeft(2).multiply(y1sqz1).subtract(w.square().multiply(w)).mod(this.curve.q);
    // z3 = 8 * (y1 * z1)^3
    var z3 = y1z1.square().multiply(y1z1).shiftLeft(3).mod(this.curve.q);

    return new ECPointFp(this.curve, this.curve.fromBigInteger(x3), this.curve.fromBigInteger(y3), z3);
}

// Simple NAF (Non-Adjacent Form) multiplication algorithm
// TODO: modularize the multiplication algorithm
function pointFpMultiply(k) {
    if(this.isInfinity()) return this;
    if(k.signum() == 0) return this.curve.getInfinity();

    var e = k;
    var h = e.multiply(new BigInteger("3"));

    var neg = this.negate();
    var R = this;

    var i;
    for(i = h.bitLength() - 2; i > 0; --i) {
	R = R.twice();

	var hBit = h.testBit(i);
	var eBit = e.testBit(i);

	if (hBit != eBit) {
	    R = R.add(hBit ? this : neg);
	}
    }

    return R;
}

// Compute this*j + x*k (simultaneous multiplication)
function pointFpMultiplyTwo(j,x,k) {
  var i;
  if(j.bitLength() > k.bitLength())
    i = j.bitLength() - 1;
  else
    i = k.bitLength() - 1;

  var R = this.curve.getInfinity();
  var both = this.add(x);
  while(i >= 0) {
    R = R.twice();
    if(j.testBit(i)) {
      if(k.testBit(i)) {
        R = R.add(both);
      }
      else {
        R = R.add(this);
      }
    }
    else {
      if(k.testBit(i)) {
        R = R.add(x);
      }
    }
    --i;
  }

  return R;
}

ECPointFp.prototype.getX = pointFpGetX;
ECPointFp.prototype.getY = pointFpGetY;
ECPointFp.prototype.equals = pointFpEquals;
ECPointFp.prototype.isInfinity = pointFpIsInfinity;
ECPointFp.prototype.negate = pointFpNegate;
ECPointFp.prototype.add = pointFpAdd;
ECPointFp.prototype.twice = pointFpTwice;
ECPointFp.prototype.multiply = pointFpMultiply;
ECPointFp.prototype.multiplyTwo = pointFpMultiplyTwo;

// ----------------
// ECCurveFp

// constructor
function ECCurveFp(q,a,b) {
    this.q = q;
    this.a = this.fromBigInteger(a);
    this.b = this.fromBigInteger(b);
    this.infinity = new ECPointFp(this, null, null);
}

function curveFpGetQ() {
    return this.q;
}

function curveFpGetA() {
    return this.a;
}

function curveFpGetB() {
    return this.b;
}

function curveFpEquals(other) {
    if(other == this) return true;
    return(this.q.equals(other.q) && this.a.equals(other.a) && this.b.equals(other.b));
}

function curveFpGetInfinity() {
    return this.infinity;
}

function curveFpFromBigInteger(x) {
    return new ECFieldElementFp(this.q, x);
}

// for now, work with hex strings because they're easier in JS
function curveFpDecodePointHex(s) {
    switch(parseInt(s.substr(0,2), 16)) { // first byte
    case 0:
	return this.infinity;
    case 2:
    case 3:
	// point compression not supported yet
	return null;
    case 4:
    case 6:
    case 7:
	var len = (s.length - 2) / 2;
	var xHex = s.substr(2, len);
	var yHex = s.substr(len+2, len);

	return new ECPointFp(this,
			     this.fromBigInteger(new BigInteger(xHex, 16)),
			     this.fromBigInteger(new BigInteger(yHex, 16)));

    default: // unsupported
	return null;
    }
}

ECCurveFp.prototype.getQ = curveFpGetQ;
ECCurveFp.prototype.getA = curveFpGetA;
ECCurveFp.prototype.getB = curveFpGetB;
ECCurveFp.prototype.equals = curveFpEquals;
ECCurveFp.prototype.getInfinity = curveFpGetInfinity;
ECCurveFp.prototype.fromBigInteger = curveFpFromBigInteger;
ECCurveFp.prototype.decodePointHex = curveFpDecodePointHex;
/*! (c) Stefan Thomas | https://github.com/bitcoinjs/bitcoinjs-lib
 */
/*
 * splitted from bitcoin-lib/ecdsa.js
 *
 * version 1.0.0 is the original of bitcoin-lib/ecdsa.js
 */
ECFieldElementFp.prototype.getByteLength = function () {
  return Math.floor((this.toBigInteger().bitLength() + 7) / 8);
};

ECPointFp.prototype.getEncoded = function (compressed) {
  var integerToBytes = function(i, len) {
    var bytes = i.toByteArrayUnsigned();

    if (len < bytes.length) {
      bytes = bytes.slice(bytes.length-len);
    } else while (len > bytes.length) {
      bytes.unshift(0);
    }
    return bytes;
  };

  var x = this.getX().toBigInteger();
  var y = this.getY().toBigInteger();

  // Get value as a 32-byte Buffer
  // Fixed length based on a patch by bitaddress.org and Casascius
  var enc = integerToBytes(x, 32);

  if (compressed) {
    if (y.isEven()) {
      // Compressed even pubkey
      // M = 02 || X
      enc.unshift(0x02);
    } else {
      // Compressed uneven pubkey
      // M = 03 || X
      enc.unshift(0x03);
    }
  } else {
    // Uncompressed pubkey
    // M = 04 || X || Y
    enc.unshift(0x04);
    enc = enc.concat(integerToBytes(y, 32));
  }
  return enc;
};

ECPointFp.decodeFrom = function (curve, enc) {
  var type = enc[0];
  var dataLen = enc.length-1;

  // Extract x and y as byte arrays
  var xBa = enc.slice(1, 1 + dataLen/2);
  var yBa = enc.slice(1 + dataLen/2, 1 + dataLen);

  // Prepend zero byte to prevent interpretation as negative integer
  xBa.unshift(0);
  yBa.unshift(0);

  // Convert to BigIntegers
  var x = new BigInteger(xBa);
  var y = new BigInteger(yBa);

  // Return point
  return new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y));
};

/*
 * @since ec-patch.js 1.0.1
 */
ECPointFp.decodeFromHex = function (curve, encHex) {
  var type = encHex.substr(0, 2); // shall be "04"
  var dataLen = encHex.length - 2;

  // Extract x and y as byte arrays
  var xHex = encHex.substr(2, dataLen / 2);
  var yHex = encHex.substr(2 + dataLen / 2, dataLen / 2);

  // Convert to BigIntegers
  var x = new BigInteger(xHex, 16);
  var y = new BigInteger(yHex, 16);

  // Return point
  return new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y));
};

ECPointFp.prototype.add2D = function (b) {
  if(this.isInfinity()) return b;
  if(b.isInfinity()) return this;

  if (this.x.equals(b.x)) {
    if (this.y.equals(b.y)) {
      // this = b, i.e. this must be doubled
      return this.twice();
    }
    // this = -b, i.e. the result is the point at infinity
    return this.curve.getInfinity();
  }

  var x_x = b.x.subtract(this.x);
  var y_y = b.y.subtract(this.y);
  var gamma = y_y.divide(x_x);

  var x3 = gamma.square().subtract(this.x).subtract(b.x);
  var y3 = gamma.multiply(this.x.subtract(x3)).subtract(this.y);

  return new ECPointFp(this.curve, x3, y3);
};

ECPointFp.prototype.twice2D = function () {
  if (this.isInfinity()) return this;
  if (this.y.toBigInteger().signum() == 0) {
    // if y1 == 0, then (x1, y1) == (x1, -y1)
    // and hence this = -this and thus 2(x1, y1) == infinity
    return this.curve.getInfinity();
  }

  var TWO = this.curve.fromBigInteger(BigInteger.valueOf(2));
  var THREE = this.curve.fromBigInteger(BigInteger.valueOf(3));
  var gamma = this.x.square().multiply(THREE).add(this.curve.a).divide(this.y.multiply(TWO));

  var x3 = gamma.square().subtract(this.x.multiply(TWO));
  var y3 = gamma.multiply(this.x.subtract(x3)).subtract(this.y);

  return new ECPointFp(this.curve, x3, y3);
};

ECPointFp.prototype.multiply2D = function (k) {
  if(this.isInfinity()) return this;
  if(k.signum() == 0) return this.curve.getInfinity();

  var e = k;
  var h = e.multiply(new BigInteger("3"));

  var neg = this.negate();
  var R = this;

  var i;
  for (i = h.bitLength() - 2; i > 0; --i) {
    R = R.twice();

    var hBit = h.testBit(i);
    var eBit = e.testBit(i);

    if (hBit != eBit) {
      R = R.add2D(hBit ? this : neg);
    }
  }

  return R;
};

ECPointFp.prototype.isOnCurve = function () {
  var x = this.getX().toBigInteger();
  var y = this.getY().toBigInteger();
  var a = this.curve.getA().toBigInteger();
  var b = this.curve.getB().toBigInteger();
  var n = this.curve.getQ();
  var lhs = y.multiply(y).mod(n);
  var rhs = x.multiply(x).multiply(x)
    .add(a.multiply(x)).add(b).mod(n);
  return lhs.equals(rhs);
};

ECPointFp.prototype.toString = function () {
  return '('+this.getX().toBigInteger().toString()+','+
    this.getY().toBigInteger().toString()+')';
};

/**
 * Validate an elliptic curve point.
 *
 * See SEC 1, section 3.2.2.1: Elliptic Curve Public Key Validation Primitive
 */
ECPointFp.prototype.validate = function () {
  var n = this.curve.getQ();

  // Check Q != O
  if (this.isInfinity()) {
    throw new Error("Point is at infinity.");
  }

  // Check coordinate bounds
  var x = this.getX().toBigInteger();
  var y = this.getY().toBigInteger();
  if (x.compareTo(BigInteger.ONE) < 0 ||
      x.compareTo(n.subtract(BigInteger.ONE)) > 0) {
    throw new Error('x coordinate out of bounds');
  }
  if (y.compareTo(BigInteger.ONE) < 0 ||
      y.compareTo(n.subtract(BigInteger.ONE)) > 0) {
    throw new Error('y coordinate out of bounds');
  }

  // Check y^2 = x^3 + ax + b (mod n)
  if (!this.isOnCurve()) {
    throw new Error("Point is not on the curve.");
  }

  // Check nQ = 0 (Q is a scalar multiple of G)
  if (this.multiply(n).isInfinity()) {
    // TODO: This check doesn't work - fix.
    throw new Error("Point is not a scalar multiple of G.");
  }

  return true;
};
/*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
 */
// Copyright (c) 2005  Tom Wu
// All Rights Reserved.
// See "LICENSE" for details.

// Basic JavaScript BN library - subset useful for RSA encryption.

// Bits per digit
var dbits;

// JavaScript engine analysis
var canary = 0xdeadbeefcafe;
var j_lm = ((canary&0xffffff)==0xefcafe);

// (public) Constructor
function BigInteger(a,b,c) {
  if(a != null)
    if("number" == typeof a) this.fromNumber(a,b,c);
    else if(b == null && "string" != typeof a) this.fromString(a,256);
    else this.fromString(a,b);
}

// return new, unset BigInteger
function nbi() { return new BigInteger(null); }

// am: Compute w_j += (x*this_i), propagate carries,
// c is initial carry, returns final carry.
// c < 3*dvalue, x < 2*dvalue, this_i < dvalue
// We need to select the fastest one that works in this environment.

// am1: use a single mult and divide to get the high bits,
// max digit bits should be 26 because
// max internal value = 2*dvalue^2-2*dvalue (< 2^53)
function am1(i,x,w,j,c,n) {
  while(--n >= 0) {
    var v = x*this[i++]+w[j]+c;
    c = Math.floor(v/0x4000000);
    w[j++] = v&0x3ffffff;
  }
  return c;
}
// am2 avoids a big mult-and-extract completely.
// Max digit bits should be <= 30 because we do bitwise ops
// on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
function am2(i,x,w,j,c,n) {
  var xl = x&0x7fff, xh = x>>15;
  while(--n >= 0) {
    var l = this[i]&0x7fff;
    var h = this[i++]>>15;
    var m = xh*l+h*xl;
    l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
    c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
    w[j++] = l&0x3fffffff;
  }
  return c;
}
// Alternately, set max digit bits to 28 since some
// browsers slow down when dealing with 32-bit numbers.
function am3(i,x,w,j,c,n) {
  var xl = x&0x3fff, xh = x>>14;
  while(--n >= 0) {
    var l = this[i]&0x3fff;
    var h = this[i++]>>14;
    var m = xh*l+h*xl;
    l = xl*l+((m&0x3fff)<<14)+w[j]+c;
    c = (l>>28)+(m>>14)+xh*h;
    w[j++] = l&0xfffffff;
  }
  return c;
}
if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
  BigInteger.prototype.am = am2;
  dbits = 30;
}
else if(j_lm && (navigator.appName != "Netscape")) {
  BigInteger.prototype.am = am1;
  dbits = 26;
}
else { // Mozilla/Netscape seems to prefer am3
  BigInteger.prototype.am = am3;
  dbits = 28;
}

BigInteger.prototype.DB = dbits;
BigInteger.prototype.DM = ((1<<dbits)-1);
BigInteger.prototype.DV = (1<<dbits);

var BI_FP = 52;
BigInteger.prototype.FV = Math.pow(2,BI_FP);
BigInteger.prototype.F1 = BI_FP-dbits;
BigInteger.prototype.F2 = 2*dbits-BI_FP;

// Digit conversions
var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
var BI_RC = new Array();
var rr,vv;
rr = "0".charCodeAt(0);
for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
rr = "a".charCodeAt(0);
for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
rr = "A".charCodeAt(0);
for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

function int2char(n) { return BI_RM.charAt(n); }
function intAt(s,i) {
  var c = BI_RC[s.charCodeAt(i)];
  return (c==null)?-1:c;
}

// (protected) copy this to r
function bnpCopyTo(r) {
  for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
  r.t = this.t;
  r.s = this.s;
}

// (protected) set from integer value x, -DV <= x < DV
function bnpFromInt(x) {
  this.t = 1;
  this.s = (x<0)?-1:0;
  if(x > 0) this[0] = x;
  else if(x < -1) this[0] = x+this.DV;
  else this.t = 0;
}

// return bigint initialized to value
function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

// (protected) set from string and radix
function bnpFromString(s,b) {
  var k;
  if(b == 16) k = 4;
  else if(b == 8) k = 3;
  else if(b == 256) k = 8; // byte array
  else if(b == 2) k = 1;
  else if(b == 32) k = 5;
  else if(b == 4) k = 2;
  else { this.fromRadix(s,b); return; }
  this.t = 0;
  this.s = 0;
  var i = s.length, mi = false, sh = 0;
  while(--i >= 0) {
    var x = (k==8)?s[i]&0xff:intAt(s,i);
    if(x < 0) {
      if(s.charAt(i) == "-") mi = true;
      continue;
    }
    mi = false;
    if(sh == 0)
      this[this.t++] = x;
    else if(sh+k > this.DB) {
      this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
      this[this.t++] = (x>>(this.DB-sh));
    }
    else
      this[this.t-1] |= x<<sh;
    sh += k;
    if(sh >= this.DB) sh -= this.DB;
  }
  if(k == 8 && (s[0]&0x80) != 0) {
    this.s = -1;
    if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
  }
  this.clamp();
  if(mi) BigInteger.ZERO.subTo(this,this);
}

// (protected) clamp off excess high words
function bnpClamp() {
  var c = this.s&this.DM;
  while(this.t > 0 && this[this.t-1] == c) --this.t;
}

// (public) return string representation in given radix
function bnToString(b) {
  if(this.s < 0) return "-"+this.negate().toString(b);
  var k;
  if(b == 16) k = 4;
  else if(b == 8) k = 3;
  else if(b == 2) k = 1;
  else if(b == 32) k = 5;
  else if(b == 4) k = 2;
  else return this.toRadix(b);
  var km = (1<<k)-1, d, m = false, r = "", i = this.t;
  var p = this.DB-(i*this.DB)%k;
  if(i-- > 0) {
    if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
    while(i >= 0) {
      if(p < k) {
        d = (this[i]&((1<<p)-1))<<(k-p);
        d |= this[--i]>>(p+=this.DB-k);
      }
      else {
        d = (this[i]>>(p-=k))&km;
        if(p <= 0) { p += this.DB; --i; }
      }
      if(d > 0) m = true;
      if(m) r += int2char(d);
    }
  }
  return m?r:"0";
}

// (public) -this
function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

// (public) |this|
function bnAbs() { return (this.s<0)?this.negate():this; }

// (public) return + if this > a, - if this < a, 0 if equal
function bnCompareTo(a) {
  var r = this.s-a.s;
  if(r != 0) return r;
  var i = this.t;
  r = i-a.t;
  if(r != 0) return (this.s<0)?-r:r;
  while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
  return 0;
}

// returns bit length of the integer x
function nbits(x) {
  var r = 1, t;
  if((t=x>>>16) != 0) { x = t; r += 16; }
  if((t=x>>8) != 0) { x = t; r += 8; }
  if((t=x>>4) != 0) { x = t; r += 4; }
  if((t=x>>2) != 0) { x = t; r += 2; }
  if((t=x>>1) != 0) { x = t; r += 1; }
  return r;
}

// (public) return the number of bits in "this"
function bnBitLength() {
  if(this.t <= 0) return 0;
  return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
}

// (protected) r = this << n*DB
function bnpDLShiftTo(n,r) {
  var i;
  for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
  for(i = n-1; i >= 0; --i) r[i] = 0;
  r.t = this.t+n;
  r.s = this.s;
}

// (protected) r = this >> n*DB
function bnpDRShiftTo(n,r) {
  for(var i = n; i < this.t; ++i) r[i-n] = this[i];
  r.t = Math.max(this.t-n,0);
  r.s = this.s;
}

// (protected) r = this << n
function bnpLShiftTo(n,r) {
  var bs = n%this.DB;
  var cbs = this.DB-bs;
  var bm = (1<<cbs)-1;
  var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
  for(i = this.t-1; i >= 0; --i) {
    r[i+ds+1] = (this[i]>>cbs)|c;
    c = (this[i]&bm)<<bs;
  }
  for(i = ds-1; i >= 0; --i) r[i] = 0;
  r[ds] = c;
  r.t = this.t+ds+1;
  r.s = this.s;
  r.clamp();
}

// (protected) r = this >> n
function bnpRShiftTo(n,r) {
  r.s = this.s;
  var ds = Math.floor(n/this.DB);
  if(ds >= this.t) { r.t = 0; return; }
  var bs = n%this.DB;
  var cbs = this.DB-bs;
  var bm = (1<<bs)-1;
  r[0] = this[ds]>>bs;
  for(var i = ds+1; i < this.t; ++i) {
    r[i-ds-1] |= (this[i]&bm)<<cbs;
    r[i-ds] = this[i]>>bs;
  }
  if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
  r.t = this.t-ds;
  r.clamp();
}

// (protected) r = this - a
function bnpSubTo(a,r) {
  var i = 0, c = 0, m = Math.min(a.t,this.t);
  while(i < m) {
    c += this[i]-a[i];
    r[i++] = c&this.DM;
    c >>= this.DB;
  }
  if(a.t < this.t) {
    c -= a.s;
    while(i < this.t) {
      c += this[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += this.s;
  }
  else {
    c += this.s;
    while(i < a.t) {
      c -= a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c -= a.s;
  }
  r.s = (c<0)?-1:0;
  if(c < -1) r[i++] = this.DV+c;
  else if(c > 0) r[i++] = c;
  r.t = i;
  r.clamp();
}

// (protected) r = this * a, r != this,a (HAC 14.12)
// "this" should be the larger one if appropriate.
function bnpMultiplyTo(a,r) {
  var x = this.abs(), y = a.abs();
  var i = x.t;
  r.t = i+y.t;
  while(--i >= 0) r[i] = 0;
  for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
  r.s = 0;
  r.clamp();
  if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
}

// (protected) r = this^2, r != this (HAC 14.16)
function bnpSquareTo(r) {
  var x = this.abs();
  var i = r.t = 2*x.t;
  while(--i >= 0) r[i] = 0;
  for(i = 0; i < x.t-1; ++i) {
    var c = x.am(i,x[i],r,2*i,0,1);
    if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
      r[i+x.t] -= x.DV;
      r[i+x.t+1] = 1;
    }
  }
  if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
  r.s = 0;
  r.clamp();
}

// (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
// r != q, this != m.  q or r may be null.
function bnpDivRemTo(m,q,r) {
  var pm = m.abs();
  if(pm.t <= 0) return;
  var pt = this.abs();
  if(pt.t < pm.t) {
    if(q != null) q.fromInt(0);
    if(r != null) this.copyTo(r);
    return;
  }
  if(r == null) r = nbi();
  var y = nbi(), ts = this.s, ms = m.s;
  var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
  if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
  else { pm.copyTo(y); pt.copyTo(r); }
  var ys = y.t;
  var y0 = y[ys-1];
  if(y0 == 0) return;
  var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
  var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
  var i = r.t, j = i-ys, t = (q==null)?nbi():q;
  y.dlShiftTo(j,t);
  if(r.compareTo(t) >= 0) {
    r[r.t++] = 1;
    r.subTo(t,r);
  }
  BigInteger.ONE.dlShiftTo(ys,t);
  t.subTo(y,y);	// "negative" y so we can replace sub with am later
  while(y.t < ys) y[y.t++] = 0;
  while(--j >= 0) {
    // Estimate quotient digit
    var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
    if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
      y.dlShiftTo(j,t);
      r.subTo(t,r);
      while(r[i] < --qd) r.subTo(t,r);
    }
  }
  if(q != null) {
    r.drShiftTo(ys,q);
    if(ts != ms) BigInteger.ZERO.subTo(q,q);
  }
  r.t = ys;
  r.clamp();
  if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
  if(ts < 0) BigInteger.ZERO.subTo(r,r);
}

// (public) this mod a
function bnMod(a) {
  var r = nbi();
  this.abs().divRemTo(a,null,r);
  if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
  return r;
}

// Modular reduction using "classic" algorithm
function Classic(m) { this.m = m; }
function cConvert(x) {
  if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
  else return x;
}
function cRevert(x) { return x; }
function cReduce(x) { x.divRemTo(this.m,null,x); }
function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

Classic.prototype.convert = cConvert;
Classic.prototype.revert = cRevert;
Classic.prototype.reduce = cReduce;
Classic.prototype.mulTo = cMulTo;
Classic.prototype.sqrTo = cSqrTo;

// (protected) return "-1/this % 2^DB"; useful for Mont. reduction
// justification:
//         xy == 1 (mod m)
//         xy =  1+km
//   xy(2-xy) = (1+km)(1-km)
// x[y(2-xy)] = 1-k^2m^2
// x[y(2-xy)] == 1 (mod m^2)
// if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
// should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
// JS multiply "overflows" differently from C/C++, so care is needed here.
function bnpInvDigit() {
  if(this.t < 1) return 0;
  var x = this[0];
  if((x&1) == 0) return 0;
  var y = x&3;		// y == 1/x mod 2^2
  y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
  y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
  y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
  // last step - calculate inverse mod DV directly;
  // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
  y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
  // we really want the negative inverse, and -DV < y < DV
  return (y>0)?this.DV-y:-y;
}

// Montgomery reduction
function Montgomery(m) {
  this.m = m;
  this.mp = m.invDigit();
  this.mpl = this.mp&0x7fff;
  this.mph = this.mp>>15;
  this.um = (1<<(m.DB-15))-1;
  this.mt2 = 2*m.t;
}

// xR mod m
function montConvert(x) {
  var r = nbi();
  x.abs().dlShiftTo(this.m.t,r);
  r.divRemTo(this.m,null,r);
  if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
  return r;
}

// x/R mod m
function montRevert(x) {
  var r = nbi();
  x.copyTo(r);
  this.reduce(r);
  return r;
}

// x = x/R mod m (HAC 14.32)
function montReduce(x) {
  while(x.t <= this.mt2)	// pad x so am has enough room later
    x[x.t++] = 0;
  for(var i = 0; i < this.m.t; ++i) {
    // faster way of calculating u0 = x[i]*mp mod DV
    var j = x[i]&0x7fff;
    var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
    // use am to combine the multiply-shift-add into one call
    j = i+this.m.t;
    x[j] += this.m.am(0,u0,x,i,0,this.m.t);
    // propagate carry
    while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
  }
  x.clamp();
  x.drShiftTo(this.m.t,x);
  if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
}

// r = "x^2/R mod m"; x != r
function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

// r = "xy/R mod m"; x,y != r
function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

Montgomery.prototype.convert = montConvert;
Montgomery.prototype.revert = montRevert;
Montgomery.prototype.reduce = montReduce;
Montgomery.prototype.mulTo = montMulTo;
Montgomery.prototype.sqrTo = montSqrTo;

// (protected) true iff this is even
function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

// (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
function bnpExp(e,z) {
  if(e > 0xffffffff || e < 1) return BigInteger.ONE;
  var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
  g.copyTo(r);
  while(--i >= 0) {
    z.sqrTo(r,r2);
    if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
    else { var t = r; r = r2; r2 = t; }
  }
  return z.revert(r);
}

// (public) this^e % m, 0 <= e < 2^32
function bnModPowInt(e,m) {
  var z;
  if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
  return this.exp(e,z);
}

// protected
BigInteger.prototype.copyTo = bnpCopyTo;
BigInteger.prototype.fromInt = bnpFromInt;
BigInteger.prototype.fromString = bnpFromString;
BigInteger.prototype.clamp = bnpClamp;
BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
BigInteger.prototype.drShiftTo = bnpDRShiftTo;
BigInteger.prototype.lShiftTo = bnpLShiftTo;
BigInteger.prototype.rShiftTo = bnpRShiftTo;
BigInteger.prototype.subTo = bnpSubTo;
BigInteger.prototype.multiplyTo = bnpMultiplyTo;
BigInteger.prototype.squareTo = bnpSquareTo;
BigInteger.prototype.divRemTo = bnpDivRemTo;
BigInteger.prototype.invDigit = bnpInvDigit;
BigInteger.prototype.isEven = bnpIsEven;
BigInteger.prototype.exp = bnpExp;

// public
BigInteger.prototype.toString = bnToString;
BigInteger.prototype.negate = bnNegate;
BigInteger.prototype.abs = bnAbs;
BigInteger.prototype.compareTo = bnCompareTo;
BigInteger.prototype.bitLength = bnBitLength;
BigInteger.prototype.mod = bnMod;
BigInteger.prototype.modPowInt = bnModPowInt;

// "constants"
BigInteger.ZERO = nbv(0);
BigInteger.ONE = nbv(1);
/*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
 */
// Copyright (c) 2005-2009  Tom Wu
// All Rights Reserved.
// See "LICENSE" for details.

// Extended JavaScript BN functions, required for RSA private ops.

// Version 1.1: new BigInteger("0", 10) returns "proper" zero
// Version 1.2: square() API, isProbablePrime fix

// (public)
function bnClone() { var r = nbi(); this.copyTo(r); return r; }

// (public) return value as integer
function bnIntValue() {
  if(this.s < 0) {
    if(this.t == 1) return this[0]-this.DV;
    else if(this.t == 0) return -1;
  }
  else if(this.t == 1) return this[0];
  else if(this.t == 0) return 0;
  // assumes 16 < DB < 32
  return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
}

// (public) return value as byte
function bnByteValue() { return (this.t==0)?this.s:(this[0]<<24)>>24; }

// (public) return value as short (assumes DB>=16)
function bnShortValue() { return (this.t==0)?this.s:(this[0]<<16)>>16; }

// (protected) return x s.t. r^x < DV
function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

// (public) 0 if this == 0, 1 if this > 0
function bnSigNum() {
  if(this.s < 0) return -1;
  else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
  else return 1;
}

// (protected) convert to radix string
function bnpToRadix(b) {
  if(b == null) b = 10;
  if(this.signum() == 0 || b < 2 || b > 36) return "0";
  var cs = this.chunkSize(b);
  var a = Math.pow(b,cs);
  var d = nbv(a), y = nbi(), z = nbi(), r = "";
  this.divRemTo(d,y,z);
  while(y.signum() > 0) {
    r = (a+z.intValue()).toString(b).substr(1) + r;
    y.divRemTo(d,y,z);
  }
  return z.intValue().toString(b) + r;
}

// (protected) convert from radix string
function bnpFromRadix(s,b) {
  this.fromInt(0);
  if(b == null) b = 10;
  var cs = this.chunkSize(b);
  var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
  for(var i = 0; i < s.length; ++i) {
    var x = intAt(s,i);
    if(x < 0) {
      if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
      continue;
    }
    w = b*w+x;
    if(++j >= cs) {
      this.dMultiply(d);
      this.dAddOffset(w,0);
      j = 0;
      w = 0;
    }
  }
  if(j > 0) {
    this.dMultiply(Math.pow(b,j));
    this.dAddOffset(w,0);
  }
  if(mi) BigInteger.ZERO.subTo(this,this);
}

// (protected) alternate constructor
function bnpFromNumber(a,b,c) {
  if("number" == typeof b) {
    // new BigInteger(int,int,RNG)
    if(a < 2) this.fromInt(1);
    else {
      this.fromNumber(a,c);
      if(!this.testBit(a-1))	// force MSB set
        this.bitwiseTo(BigInteger.ONE.shiftLeft(a-1),op_or,this);
      if(this.isEven()) this.dAddOffset(1,0); // force odd
      while(!this.isProbablePrime(b)) {
        this.dAddOffset(2,0);
        if(this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a-1),this);
      }
    }
  }
  else {
    // new BigInteger(int,RNG)
    var x = new Array(), t = a&7;
    x.length = (a>>3)+1;
    b.nextBytes(x);
    if(t > 0) x[0] &= ((1<<t)-1); else x[0] = 0;
    this.fromString(x,256);
  }
}

// (public) convert to bigendian byte array
function bnToByteArray() {
  var i = this.t, r = new Array();
  r[0] = this.s;
  var p = this.DB-(i*this.DB)%8, d, k = 0;
  if(i-- > 0) {
    if(p < this.DB && (d = this[i]>>p) != (this.s&this.DM)>>p)
      r[k++] = d|(this.s<<(this.DB-p));
    while(i >= 0) {
      if(p < 8) {
        d = (this[i]&((1<<p)-1))<<(8-p);
        d |= this[--i]>>(p+=this.DB-8);
      }
      else {
        d = (this[i]>>(p-=8))&0xff;
        if(p <= 0) { p += this.DB; --i; }
      }
      if((d&0x80) != 0) d |= -256;
      if(k == 0 && (this.s&0x80) != (d&0x80)) ++k;
      if(k > 0 || d != this.s) r[k++] = d;
    }
  }
  return r;
}

function bnEquals(a) { return(this.compareTo(a)==0); }
function bnMin(a) { return(this.compareTo(a)<0)?this:a; }
function bnMax(a) { return(this.compareTo(a)>0)?this:a; }

// (protected) r = this op a (bitwise)
function bnpBitwiseTo(a,op,r) {
  var i, f, m = Math.min(a.t,this.t);
  for(i = 0; i < m; ++i) r[i] = op(this[i],a[i]);
  if(a.t < this.t) {
    f = a.s&this.DM;
    for(i = m; i < this.t; ++i) r[i] = op(this[i],f);
    r.t = this.t;
  }
  else {
    f = this.s&this.DM;
    for(i = m; i < a.t; ++i) r[i] = op(f,a[i]);
    r.t = a.t;
  }
  r.s = op(this.s,a.s);
  r.clamp();
}

// (public) this & a
function op_and(x,y) { return x&y; }
function bnAnd(a) { var r = nbi(); this.bitwiseTo(a,op_and,r); return r; }

// (public) this | a
function op_or(x,y) { return x|y; }
function bnOr(a) { var r = nbi(); this.bitwiseTo(a,op_or,r); return r; }

// (public) this ^ a
function op_xor(x,y) { return x^y; }
function bnXor(a) { var r = nbi(); this.bitwiseTo(a,op_xor,r); return r; }

// (public) this & ~a
function op_andnot(x,y) { return x&~y; }
function bnAndNot(a) { var r = nbi(); this.bitwiseTo(a,op_andnot,r); return r; }

// (public) ~this
function bnNot() {
  var r = nbi();
  for(var i = 0; i < this.t; ++i) r[i] = this.DM&~this[i];
  r.t = this.t;
  r.s = ~this.s;
  return r;
}

// (public) this << n
function bnShiftLeft(n) {
  var r = nbi();
  if(n < 0) this.rShiftTo(-n,r); else this.lShiftTo(n,r);
  return r;
}

// (public) this >> n
function bnShiftRight(n) {
  var r = nbi();
  if(n < 0) this.lShiftTo(-n,r); else this.rShiftTo(n,r);
  return r;
}

// return index of lowest 1-bit in x, x < 2^31
function lbit(x) {
  if(x == 0) return -1;
  var r = 0;
  if((x&0xffff) == 0) { x >>= 16; r += 16; }
  if((x&0xff) == 0) { x >>= 8; r += 8; }
  if((x&0xf) == 0) { x >>= 4; r += 4; }
  if((x&3) == 0) { x >>= 2; r += 2; }
  if((x&1) == 0) ++r;
  return r;
}

// (public) returns index of lowest 1-bit (or -1 if none)
function bnGetLowestSetBit() {
  for(var i = 0; i < this.t; ++i)
    if(this[i] != 0) return i*this.DB+lbit(this[i]);
  if(this.s < 0) return this.t*this.DB;
  return -1;
}

// return number of 1 bits in x
function cbit(x) {
  var r = 0;
  while(x != 0) { x &= x-1; ++r; }
  return r;
}

// (public) return number of set bits
function bnBitCount() {
  var r = 0, x = this.s&this.DM;
  for(var i = 0; i < this.t; ++i) r += cbit(this[i]^x);
  return r;
}

// (public) true iff nth bit is set
function bnTestBit(n) {
  var j = Math.floor(n/this.DB);
  if(j >= this.t) return(this.s!=0);
  return((this[j]&(1<<(n%this.DB)))!=0);
}

// (protected) this op (1<<n)
function bnpChangeBit(n,op) {
  var r = BigInteger.ONE.shiftLeft(n);
  this.bitwiseTo(r,op,r);
  return r;
}

// (public) this | (1<<n)
function bnSetBit(n) { return this.changeBit(n,op_or); }

// (public) this & ~(1<<n)
function bnClearBit(n) { return this.changeBit(n,op_andnot); }

// (public) this ^ (1<<n)
function bnFlipBit(n) { return this.changeBit(n,op_xor); }

// (protected) r = this + a
function bnpAddTo(a,r) {
  var i = 0, c = 0, m = Math.min(a.t,this.t);
  while(i < m) {
    c += this[i]+a[i];
    r[i++] = c&this.DM;
    c >>= this.DB;
  }
  if(a.t < this.t) {
    c += a.s;
    while(i < this.t) {
      c += this[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += this.s;
  }
  else {
    c += this.s;
    while(i < a.t) {
      c += a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += a.s;
  }
  r.s = (c<0)?-1:0;
  if(c > 0) r[i++] = c;
  else if(c < -1) r[i++] = this.DV+c;
  r.t = i;
  r.clamp();
}

// (public) this + a
function bnAdd(a) { var r = nbi(); this.addTo(a,r); return r; }

// (public) this - a
function bnSubtract(a) { var r = nbi(); this.subTo(a,r); return r; }

// (public) this * a
function bnMultiply(a) { var r = nbi(); this.multiplyTo(a,r); return r; }

// (public) this^2
function bnSquare() { var r = nbi(); this.squareTo(r); return r; }

// (public) this / a
function bnDivide(a) { var r = nbi(); this.divRemTo(a,r,null); return r; }

// (public) this % a
function bnRemainder(a) { var r = nbi(); this.divRemTo(a,null,r); return r; }

// (public) [this/a,this%a]
function bnDivideAndRemainder(a) {
  var q = nbi(), r = nbi();
  this.divRemTo(a,q,r);
  return new Array(q,r);
}

// (protected) this *= n, this >= 0, 1 < n < DV
function bnpDMultiply(n) {
  this[this.t] = this.am(0,n-1,this,0,0,this.t);
  ++this.t;
  this.clamp();
}

// (protected) this += n << w words, this >= 0
function bnpDAddOffset(n,w) {
  if(n == 0) return;
  while(this.t <= w) this[this.t++] = 0;
  this[w] += n;
  while(this[w] >= this.DV) {
    this[w] -= this.DV;
    if(++w >= this.t) this[this.t++] = 0;
    ++this[w];
  }
}

// A "null" reducer
function NullExp() {}
function nNop(x) { return x; }
function nMulTo(x,y,r) { x.multiplyTo(y,r); }
function nSqrTo(x,r) { x.squareTo(r); }

NullExp.prototype.convert = nNop;
NullExp.prototype.revert = nNop;
NullExp.prototype.mulTo = nMulTo;
NullExp.prototype.sqrTo = nSqrTo;

// (public) this^e
function bnPow(e) { return this.exp(e,new NullExp()); }

// (protected) r = lower n words of "this * a", a.t <= n
// "this" should be the larger one if appropriate.
function bnpMultiplyLowerTo(a,n,r) {
  var i = Math.min(this.t+a.t,n);
  r.s = 0; // assumes a,this >= 0
  r.t = i;
  while(i > 0) r[--i] = 0;
  var j;
  for(j = r.t-this.t; i < j; ++i) r[i+this.t] = this.am(0,a[i],r,i,0,this.t);
  for(j = Math.min(a.t,n); i < j; ++i) this.am(0,a[i],r,i,0,n-i);
  r.clamp();
}

// (protected) r = "this * a" without lower n words, n > 0
// "this" should be the larger one if appropriate.
function bnpMultiplyUpperTo(a,n,r) {
  --n;
  var i = r.t = this.t+a.t-n;
  r.s = 0; // assumes a,this >= 0
  while(--i >= 0) r[i] = 0;
  for(i = Math.max(n-this.t,0); i < a.t; ++i)
    r[this.t+i-n] = this.am(n-i,a[i],r,0,0,this.t+i-n);
  r.clamp();
  r.drShiftTo(1,r);
}

// Barrett modular reduction
function Barrett(m) {
  // setup Barrett
  this.r2 = nbi();
  this.q3 = nbi();
  BigInteger.ONE.dlShiftTo(2*m.t,this.r2);
  this.mu = this.r2.divide(m);
  this.m = m;
}

function barrettConvert(x) {
  if(x.s < 0 || x.t > 2*this.m.t) return x.mod(this.m);
  else if(x.compareTo(this.m) < 0) return x;
  else { var r = nbi(); x.copyTo(r); this.reduce(r); return r; }
}

function barrettRevert(x) { return x; }

// x = x mod m (HAC 14.42)
function barrettReduce(x) {
  x.drShiftTo(this.m.t-1,this.r2);
  if(x.t > this.m.t+1) { x.t = this.m.t+1; x.clamp(); }
  this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3);
  this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);
  while(x.compareTo(this.r2) < 0) x.dAddOffset(1,this.m.t+1);
  x.subTo(this.r2,x);
  while(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
}

// r = x^2 mod m; x != r
function barrettSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

// r = x*y mod m; x,y != r
function barrettMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

Barrett.prototype.convert = barrettConvert;
Barrett.prototype.revert = barrettRevert;
Barrett.prototype.reduce = barrettReduce;
Barrett.prototype.mulTo = barrettMulTo;
Barrett.prototype.sqrTo = barrettSqrTo;

// (public) this^e % m (HAC 14.85)
function bnModPow(e,m) {
  var i = e.bitLength(), k, r = nbv(1), z;
  if(i <= 0) return r;
  else if(i < 18) k = 1;
  else if(i < 48) k = 3;
  else if(i < 144) k = 4;
  else if(i < 768) k = 5;
  else k = 6;
  if(i < 8)
    z = new Classic(m);
  else if(m.isEven())
    z = new Barrett(m);
  else
    z = new Montgomery(m);

  // precomputation
  var g = new Array(), n = 3, k1 = k-1, km = (1<<k)-1;
  g[1] = z.convert(this);
  if(k > 1) {
    var g2 = nbi();
    z.sqrTo(g[1],g2);
    while(n <= km) {
      g[n] = nbi();
      z.mulTo(g2,g[n-2],g[n]);
      n += 2;
    }
  }

  var j = e.t-1, w, is1 = true, r2 = nbi(), t;
  i = nbits(e[j])-1;
  while(j >= 0) {
    if(i >= k1) w = (e[j]>>(i-k1))&km;
    else {
      w = (e[j]&((1<<(i+1))-1))<<(k1-i);
      if(j > 0) w |= e[j-1]>>(this.DB+i-k1);
    }

    n = k;
    while((w&1) == 0) { w >>= 1; --n; }
    if((i -= n) < 0) { i += this.DB; --j; }
    if(is1) {	// ret == 1, don't bother squaring or multiplying it
      g[w].copyTo(r);
      is1 = false;
    }
    else {
      while(n > 1) { z.sqrTo(r,r2); z.sqrTo(r2,r); n -= 2; }
      if(n > 0) z.sqrTo(r,r2); else { t = r; r = r2; r2 = t; }
      z.mulTo(r2,g[w],r);
    }

    while(j >= 0 && (e[j]&(1<<i)) == 0) {
      z.sqrTo(r,r2); t = r; r = r2; r2 = t;
      if(--i < 0) { i = this.DB-1; --j; }
    }
  }
  return z.revert(r);
}

// (public) gcd(this,a) (HAC 14.54)
function bnGCD(a) {
  var x = (this.s<0)?this.negate():this.clone();
  var y = (a.s<0)?a.negate():a.clone();
  if(x.compareTo(y) < 0) { var t = x; x = y; y = t; }
  var i = x.getLowestSetBit(), g = y.getLowestSetBit();
  if(g < 0) return x;
  if(i < g) g = i;
  if(g > 0) {
    x.rShiftTo(g,x);
    y.rShiftTo(g,y);
  }
  while(x.signum() > 0) {
    if((i = x.getLowestSetBit()) > 0) x.rShiftTo(i,x);
    if((i = y.getLowestSetBit()) > 0) y.rShiftTo(i,y);
    if(x.compareTo(y) >= 0) {
      x.subTo(y,x);
      x.rShiftTo(1,x);
    }
    else {
      y.subTo(x,y);
      y.rShiftTo(1,y);
    }
  }
  if(g > 0) y.lShiftTo(g,y);
  return y;
}

// (protected) this % n, n < 2^26
function bnpModInt(n) {
  if(n <= 0) return 0;
  var d = this.DV%n, r = (this.s<0)?n-1:0;
  if(this.t > 0)
    if(d == 0) r = this[0]%n;
    else for(var i = this.t-1; i >= 0; --i) r = (d*r+this[i])%n;
  return r;
}

// (public) 1/this % m (HAC 14.61)
function bnModInverse(m) {
  var ac = m.isEven();
  if((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
  var u = m.clone(), v = this.clone();
  var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
  while(u.signum() != 0) {
    while(u.isEven()) {
      u.rShiftTo(1,u);
      if(ac) {
        if(!a.isEven() || !b.isEven()) { a.addTo(this,a); b.subTo(m,b); }
        a.rShiftTo(1,a);
      }
      else if(!b.isEven()) b.subTo(m,b);
      b.rShiftTo(1,b);
    }
    while(v.isEven()) {
      v.rShiftTo(1,v);
      if(ac) {
        if(!c.isEven() || !d.isEven()) { c.addTo(this,c); d.subTo(m,d); }
        c.rShiftTo(1,c);
      }
      else if(!d.isEven()) d.subTo(m,d);
      d.rShiftTo(1,d);
    }
    if(u.compareTo(v) >= 0) {
      u.subTo(v,u);
      if(ac) a.subTo(c,a);
      b.subTo(d,b);
    }
    else {
      v.subTo(u,v);
      if(ac) c.subTo(a,c);
      d.subTo(b,d);
    }
  }
  if(v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
  if(d.compareTo(m) >= 0) return d.subtract(m);
  if(d.signum() < 0) d.addTo(m,d); else return d;
  if(d.signum() < 0) return d.add(m); else return d;
}

var lowprimes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997];
var lplim = (1<<26)/lowprimes[lowprimes.length-1];

// (public) test primality with certainty >= 1-.5^t
function bnIsProbablePrime(t) {
  var i, x = this.abs();
  if(x.t == 1 && x[0] <= lowprimes[lowprimes.length-1]) {
    for(i = 0; i < lowprimes.length; ++i)
      if(x[0] == lowprimes[i]) return true;
    return false;
  }
  if(x.isEven()) return false;
  i = 1;
  while(i < lowprimes.length) {
    var m = lowprimes[i], j = i+1;
    while(j < lowprimes.length && m < lplim) m *= lowprimes[j++];
    m = x.modInt(m);
    while(i < j) if(m%lowprimes[i++] == 0) return false;
  }
  return x.millerRabin(t);
}

// (protected) true if probably prime (HAC 4.24, Miller-Rabin)
function bnpMillerRabin(t) {
  var n1 = this.subtract(BigInteger.ONE);
  var k = n1.getLowestSetBit();
  if(k <= 0) return false;
  var r = n1.shiftRight(k);
  t = (t+1)>>1;
  if(t > lowprimes.length) t = lowprimes.length;
  var a = nbi();
  for(var i = 0; i < t; ++i) {
    //Pick bases at random, instead of starting at 2
    a.fromInt(lowprimes[Math.floor(Math.random()*lowprimes.length)]);
    var y = a.modPow(r,this);
    if(y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
      var j = 1;
      while(j++ < k && y.compareTo(n1) != 0) {
        y = y.modPowInt(2,this);
        if(y.compareTo(BigInteger.ONE) == 0) return false;
      }
      if(y.compareTo(n1) != 0) return false;
    }
  }
  return true;
}

// protected
BigInteger.prototype.chunkSize = bnpChunkSize;
BigInteger.prototype.toRadix = bnpToRadix;
BigInteger.prototype.fromRadix = bnpFromRadix;
BigInteger.prototype.fromNumber = bnpFromNumber;
BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
BigInteger.prototype.changeBit = bnpChangeBit;
BigInteger.prototype.addTo = bnpAddTo;
BigInteger.prototype.dMultiply = bnpDMultiply;
BigInteger.prototype.dAddOffset = bnpDAddOffset;
BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
BigInteger.prototype.modInt = bnpModInt;
BigInteger.prototype.millerRabin = bnpMillerRabin;

// public
BigInteger.prototype.clone = bnClone;
BigInteger.prototype.intValue = bnIntValue;
BigInteger.prototype.byteValue = bnByteValue;
BigInteger.prototype.shortValue = bnShortValue;
BigInteger.prototype.signum = bnSigNum;
BigInteger.prototype.toByteArray = bnToByteArray;
BigInteger.prototype.equals = bnEquals;
BigInteger.prototype.min = bnMin;
BigInteger.prototype.max = bnMax;
BigInteger.prototype.and = bnAnd;
BigInteger.prototype.or = bnOr;
BigInteger.prototype.xor = bnXor;
BigInteger.prototype.andNot = bnAndNot;
BigInteger.prototype.not = bnNot;
BigInteger.prototype.shiftLeft = bnShiftLeft;
BigInteger.prototype.shiftRight = bnShiftRight;
BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
BigInteger.prototype.bitCount = bnBitCount;
BigInteger.prototype.testBit = bnTestBit;
BigInteger.prototype.setBit = bnSetBit;
BigInteger.prototype.clearBit = bnClearBit;
BigInteger.prototype.flipBit = bnFlipBit;
BigInteger.prototype.add = bnAdd;
BigInteger.prototype.subtract = bnSubtract;
BigInteger.prototype.multiply = bnMultiply;
BigInteger.prototype.divide = bnDivide;
BigInteger.prototype.remainder = bnRemainder;
BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
BigInteger.prototype.modPow = bnModPow;
BigInteger.prototype.modInverse = bnModInverse;
BigInteger.prototype.pow = bnPow;
BigInteger.prototype.gcd = bnGCD;
BigInteger.prototype.isProbablePrime = bnIsProbablePrime;

// JSBN-specific extension
BigInteger.prototype.square = bnSquare;

// BigInteger interfaces not implemented in jsbn:

// BigInteger(int signum, byte[] magnitude)
// double doubleValue()
// float floatValue()
// int hashCode()
// long longValue()
// static BigInteger valueOf(long val)
/*! Mike Samuel (c) 2009 | code.google.com/p/json-sans-eval
 */
// This source code is free for use in the public domain.
// NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

// https://code.google.com/p/json-sans-eval/

/**
 * Parses a string of well-formed JSON text.
 *
 * If the input is not well-formed, then behavior is undefined, but it is
 * deterministic and is guaranteed not to modify any object other than its
 * return value.
 *
 * This does not use `eval` so is less likely to have obscure security bugs than
 * json2.js.
 * It is optimized for speed, so is much faster than json_parse.js.
 *
 * This library should be used whenever security is a concern (when JSON may
 * come from an untrusted source), speed is a concern, and erroring on malformed
 * JSON is *not* a concern.
 *
 *                      Pros                   Cons
 *                    +-----------------------+-----------------------+
 * json_sans_eval.js  | Fast, secure          | Not validating        |
 *                    +-----------------------+-----------------------+
 * json_parse.js      | Validating, secure    | Slow                  |
 *                    +-----------------------+-----------------------+
 * json2.js           | Fast, some validation | Potentially insecure  |
 *                    +-----------------------+-----------------------+
 *
 * json2.js is very fast, but potentially insecure since it calls `eval` to
 * parse JSON data, so an attacker might be able to supply strange JS that
 * looks like JSON, but that executes arbitrary javascript.
 * If you do have to use json2.js with untrusted data, make sure you keep
 * your version of json2.js up to date so that you get patches as they're
 * released.
 *
 * @param {string} json per RFC 4627
 * @param {function (this:Object, string, *):*} opt_reviver optional function
 *     that reworks JSON objects post-parse per Chapter 15.12 of EcmaScript3.1.
 *     If supplied, the function is called with a string key, and a value.
 *     The value is the property of 'this'.  The reviver should return
 *     the value to use in its place.  So if dates were serialized as
 *     {@code { "type": "Date", "time": 1234 }}, then a reviver might look like
 *     {@code
 *     function (key, value) {
 *       if (value && typeof value === 'object' && 'Date' === value.type) {
 *         return new Date(value.time);
 *       } else {
 *         return value;
 *       }
 *     }}.
 *     If the reviver returns {@code undefined} then the property named by key
 *     will be deleted from its container.
 *     {@code this} is bound to the object containing the specified property.
 * @return {Object|Array}
 * @author Mike Samuel <mikesamuel@gmail.com>
 */
var jsonParse = (function () {
  var number
      = '(?:-?\\b(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?\\b)';
  var oneChar = '(?:[^\\0-\\x08\\x0a-\\x1f\"\\\\]'
      + '|\\\\(?:[\"/\\\\bfnrt]|u[0-9A-Fa-f]{4}))';
  var string = '(?:\"' + oneChar + '*\")';

  // Will match a value in a well-formed JSON file.
  // If the input is not well-formed, may match strangely, but not in an unsafe
  // way.
  // Since this only matches value tokens, it does not match whitespace, colons,
  // or commas.
  var jsonToken = new RegExp(
      '(?:false|true|null|[\\{\\}\\[\\]]'
      + '|' + number
      + '|' + string
      + ')', 'g');

  // Matches escape sequences in a string literal
  var escapeSequence = new RegExp('\\\\(?:([^u])|u(.{4}))', 'g');

  // Decodes escape sequences in object literals
  var escapes = {
    '"': '"',
    '/': '/',
    '\\': '\\',
    'b': '\b',
    'f': '\f',
    'n': '\n',
    'r': '\r',
    't': '\t'
  };
  function unescapeOne(_, ch, hex) {
    return ch ? escapes[ch] : String.fromCharCode(parseInt(hex, 16));
  }

  // A non-falsy value that coerces to the empty string when used as a key.
  var EMPTY_STRING = new String('');
  var SLASH = '\\';

  // Constructor to use based on an open token.
  var firstTokenCtors = { '{': Object, '[': Array };

  var hop = Object.hasOwnProperty;

  return function (json, opt_reviver) {
    // Split into tokens
    var toks = json.match(jsonToken);
    // Construct the object to return
    var result;
    var tok = toks[0];
    var topLevelPrimitive = false;
    if ('{' === tok) {
      result = {};
    } else if ('[' === tok) {
      result = [];
    } else {
      // The RFC only allows arrays or objects at the top level, but the JSON.parse
      // defined by the EcmaScript 5 draft does allow strings, booleans, numbers, and null
      // at the top level.
      result = [];
      topLevelPrimitive = true;
    }

    // If undefined, the key in an object key/value record to use for the next
    // value parsed.
    var key;
    // Loop over remaining tokens maintaining a stack of uncompleted objects and
    // arrays.
    var stack = [result];
    for (var i = 1 - topLevelPrimitive, n = toks.length; i < n; ++i) {
      tok = toks[i];

      var cont;
      switch (tok.charCodeAt(0)) {
        default:  // sign or digit
          cont = stack[0];
          cont[key || cont.length] = +(tok);
          key = void 0;
          break;
        case 0x22:  // '"'
          tok = tok.substring(1, tok.length - 1);
          if (tok.indexOf(SLASH) !== -1) {
            tok = tok.replace(escapeSequence, unescapeOne);
          }
          cont = stack[0];
          if (!key) {
            if (cont instanceof Array) {
              key = cont.length;
            } else {
              key = tok || EMPTY_STRING;  // Use as key for next value seen.
              break;
            }
          }
          cont[key] = tok;
          key = void 0;
          break;
        case 0x5b:  // '['
          cont = stack[0];
          stack.unshift(cont[key || cont.length] = []);
          key = void 0;
          break;
        case 0x5d:  // ']'
          stack.shift();
          break;
        case 0x66:  // 'f'
          cont = stack[0];
          cont[key || cont.length] = false;
          key = void 0;
          break;
        case 0x6e:  // 'n'
          cont = stack[0];
          cont[key || cont.length] = null;
          key = void 0;
          break;
        case 0x74:  // 't'
          cont = stack[0];
          cont[key || cont.length] = true;
          key = void 0;
          break;
        case 0x7b:  // '{'
          cont = stack[0];
          stack.unshift(cont[key || cont.length] = {});
          key = void 0;
          break;
        case 0x7d:  // '}'
          stack.shift();
          break;
      }
    }
    // Fail if we've got an uncompleted object.
    if (topLevelPrimitive) {
      if (stack.length !== 1) { throw new Error(); }
      result = result[0];
    } else {
      if (stack.length) { throw new Error(); }
    }

    if (opt_reviver) {
      // Based on walk as implemented in http://www.json.org/json2.js
      var walk = function (holder, key) {
        var value = holder[key];
        if (value && typeof value === 'object') {
          var toDelete = null;
          for (var k in value) {
            if (hop.call(value, k) && value !== holder) {
              // Recurse to properties first.  This has the effect of causing
              // the reviver to be called on the object graph depth-first.

              // Since 'this' is bound to the holder of the property, the
              // reviver can access sibling properties of k including ones
              // that have not yet been revived.

              // The value returned by the reviver is used in place of the
              // current value of property k.
              // If it returns undefined then the property is deleted.
              var v = walk(value, k);
              if (v !== void 0) {
                value[k] = v;
              } else {
                // Deleting properties inside the loop has vaguely defined
                // semantics in ES3 and ES3.1.
                if (!toDelete) { toDelete = []; }
                toDelete.push(k);
              }
            }
          }
          if (toDelete) {
            for (var i = toDelete.length; --i >= 0;) {
              delete value[toDelete[i]];
            }
          }
        }
        return opt_reviver.call(holder, key, value);
      };
      result = walk({ '': result }, '');
    }

    return result;
  };
})();
/*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
 */
// prng4.js - uses Arcfour as a PRNG

function Arcfour() {
  this.i = 0;
  this.j = 0;
  this.S = new Array();
}

// Initialize arcfour context from key, an array of ints, each from [0..255]
function ARC4init(key) {
  var i, j, t;
  for(i = 0; i < 256; ++i)
    this.S[i] = i;
  j = 0;
  for(i = 0; i < 256; ++i) {
    j = (j + this.S[i] + key[i % key.length]) & 255;
    t = this.S[i];
    this.S[i] = this.S[j];
    this.S[j] = t;
  }
  this.i = 0;
  this.j = 0;
}

function ARC4next() {
  var t;
  this.i = (this.i + 1) & 255;
  this.j = (this.j + this.S[this.i]) & 255;
  t = this.S[this.i];
  this.S[this.i] = this.S[this.j];
  this.S[this.j] = t;
  return this.S[(t + this.S[this.i]) & 255];
}

Arcfour.prototype.init = ARC4init;
Arcfour.prototype.next = ARC4next;

// Plug in your RNG constructor here
function prng_newstate() {
  return new Arcfour();
}

// Pool size must be a multiple of 4 and greater than 32.
// An array of bytes the size of the pool will be passed to init()
var rng_psize = 256;
/*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
 */
// Random number generator - requires a PRNG backend, e.g. prng4.js

// For best results, put code like
// <body onClick='rng_seed_time();' onKeyPress='rng_seed_time();'>
// in your main HTML document.

var rng_state;
var rng_pool;
var rng_pptr;

// Mix in a 32-bit integer into the pool
function rng_seed_int(x) {
  rng_pool[rng_pptr++] ^= x & 255;
  rng_pool[rng_pptr++] ^= (x >> 8) & 255;
  rng_pool[rng_pptr++] ^= (x >> 16) & 255;
  rng_pool[rng_pptr++] ^= (x >> 24) & 255;
  if(rng_pptr >= rng_psize) rng_pptr -= rng_psize;
}

// Mix in the current time (w/milliseconds) into the pool
function rng_seed_time() {
  rng_seed_int(new Date().getTime());
}

// Initialize the pool with junk if needed.
if (rng_pool == null) {
  rng_pool = new Array();
  rng_pptr = 0;
  var t;
  if (window !== undefined &&
      (window.crypto !== undefined ||
       window.msCrypto !== undefined)) {
    var crypto = window.crypto || window.msCrypto;
    if (crypto.getRandomValues) {
      // Use webcrypto if available
      var ua = new Uint8Array(32);
      crypto.getRandomValues(ua);
      for(t = 0; t < 32; ++t)
        rng_pool[rng_pptr++] = ua[t];
    } else if (navigator.appName == "Netscape" && navigator.appVersion < "5") {
      // Extract entropy (256 bits) from NS4 RNG if available
      var z = window.crypto.random(32);
      for(t = 0; t < z.length; ++t)
        rng_pool[rng_pptr++] = z.charCodeAt(t) & 255;
    }
  }  
  while (rng_pptr < rng_psize) {  // extract some randomness from Math.random()
    t = Math.floor(65536 * Math.random());
    rng_pool[rng_pptr++] = t >>> 8;
    rng_pool[rng_pptr++] = t & 255;
  }
  rng_pptr = 0;
  rng_seed_time();
  //rng_seed_int(window.screenX);
  //rng_seed_int(window.screenY);
}

function rng_get_byte() {
  if (rng_state == null) {
    rng_seed_time();
    rng_state = prng_newstate();
    rng_state.init(rng_pool);
    for(rng_pptr = 0; rng_pptr < rng_pool.length; ++rng_pptr)
      rng_pool[rng_pptr] = 0;
    rng_pptr = 0;
    //rng_pool = null;
  }
  // TODO: allow reseeding after first request
  return rng_state.next();
}

function rng_get_bytes(ba) {
  var i;
  for (i = 0; i < ba.length; ++i) ba[i] = rng_get_byte();
}

function SecureRandom() {}

SecureRandom.prototype.nextBytes = rng_get_bytes;
/*!
Copyright (c) 2011, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://developer.yahoo.com/yui/license.html
version: 2.9.0
*/
if (YAHOO === undefined) {var YAHOO = {};}
YAHOO.lang = {
    /**
     * Utility to set up the prototype, constructor and superclass properties to
     * support an inheritance strategy that can chain constructors and methods.
     * Static members will not be inherited.
     *
     * @method extend
     * @static
     * @param {Function} subc   the object to modify
     * @param {Function} superc the object to inherit
     * @param {Object} overrides  additional properties/methods to add to the
     *                              subclass prototype.  These will override the
     *                              matching items obtained from the superclass
     *                              if present.
     */
    extend: function(subc, superc, overrides) {
	if (! superc || ! subc) {
            throw new Error("YAHOO.lang.extend failed, please check that " +
                            "all dependencies are included.");
	}
	
	var F = function() {};
	F.prototype = superc.prototype;
	subc.prototype = new F();
	subc.prototype.constructor = subc;
	subc.superclass = superc.prototype;
     
	if (superc.prototype.constructor == Object.prototype.constructor) {
            superc.prototype.constructor = superc;
	}
 
	if (overrides) {
	    var i;
            for (i in overrides) {
		subc.prototype[i] = overrides[i];
            }
 
	    /*
	     * IE will not enumerate native functions in a derived object even if the
	     * function was overridden.  This is a workaround for specific functions 
	     * we care about on the Object prototype. 
	     * @property _IEEnumFix
	     * @param {Function} r  the object to receive the augmentation
	     * @param {Function} s  the object that supplies the properties to augment
	     * @static
	     * @private
	     */
	    var _IEEnumFix = function() {},
		ADD = ["toString", "valueOf"];
	    try {
		if (/MSIE/.test(navigator.userAgent)) {
		    _IEEnumFix = function(r, s) {
			for (i = 0; i < ADD.length; i = i + 1) {
			    var fname = ADD[i], f = s[fname];
			    if (typeof f === 'function' && f != Object.prototype[fname]) {
				r[fname] = f;
			    }
			}
		    };
		}
	    } catch (ex) {};
            _IEEnumFix(subc.prototype, overrides);
	}
    }
};
/*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
 */
// Depends on jsbn.js and rng.js

// Version 1.1: support utf-8 encoding in pkcs1pad2

// convert a (hex) string to a bignum object
function parseBigInt(str,r) {
  return new BigInteger(str,r);
}

function linebrk(s,n) {
  var ret = "";
  var i = 0;
  while(i + n < s.length) {
    ret += s.substring(i,i+n) + "\n";
    i += n;
  }
  return ret + s.substring(i,s.length);
}

function byte2Hex(b) {
  if(b < 0x10)
    return "0" + b.toString(16);
  else
    return b.toString(16);
}

// PKCS#1 (type 2, random) pad input string s to n bytes, and return a bigint
function pkcs1pad2(s,n) {
  if(n < s.length + 11) { // TODO: fix for utf-8
    throw "Message too long for RSA";
    return null;
  }
  var ba = new Array();
  var i = s.length - 1;
  while(i >= 0 && n > 0) {
    var c = s.charCodeAt(i--);
    if(c < 128) { // encode using utf-8
      ba[--n] = c;
    }
    else if((c > 127) && (c < 2048)) {
      ba[--n] = (c & 63) | 128;
      ba[--n] = (c >> 6) | 192;
    }
    else {
      ba[--n] = (c & 63) | 128;
      ba[--n] = ((c >> 6) & 63) | 128;
      ba[--n] = (c >> 12) | 224;
    }
  }
  ba[--n] = 0;
  var rng = new SecureRandom();
  var x = new Array();
  while(n > 2) { // random non-zero pad
    x[0] = 0;
    while(x[0] == 0) rng.nextBytes(x);
    ba[--n] = x[0];
  }
  ba[--n] = 2;
  ba[--n] = 0;
  return new BigInteger(ba);
}

// PKCS#1 (OAEP) mask generation function
function oaep_mgf1_arr(seed, len, hash)
{
    var mask = '', i = 0;

    while (mask.length < len)
    {
        mask += hash(String.fromCharCode.apply(String, seed.concat([
                (i & 0xff000000) >> 24,
                (i & 0x00ff0000) >> 16,
                (i & 0x0000ff00) >> 8,
                i & 0x000000ff])));
        i += 1;
    }

    return mask;
}

/**
 * PKCS#1 (OAEP) pad input string s to n bytes, and return a bigint
 * @name oaep_pad
 * @param s raw string of message
 * @param n key length of RSA key
 * @param hash JavaScript function to calculate raw hash value from raw string or algorithm name (ex. "SHA1") 
 * @param hashLen byte length of resulted hash value (ex. 20 for SHA1)
 * @return {BigInteger} BigInteger object of resulted PKCS#1 OAEP padded message
 * @description
 * This function calculates OAEP padded message from original message.<br/>
 * NOTE: Since jsrsasign 6.2.0, 'hash' argument can accept an algorithm name such as "sha1".
 * @example
 * oaep_pad("aaa", 128) &rarr; big integer object // SHA-1 by default
 * oaep_pad("aaa", 128, function(s) {...}, 20);
 * oaep_pad("aaa", 128, "sha1");
 */
function oaep_pad(s, n, hash, hashLen) {
    var MD = KJUR.crypto.MessageDigest;
    var Util = KJUR.crypto.Util;
    var algName = null;

    if (!hash) hash = "sha1";

    if (typeof hash === "string") {
        algName = MD.getCanonicalAlgName(hash);
        hashLen = MD.getHashLength(algName);
        hash = function(s) {
            return hextorstr(Util.hashHex(rstrtohex(s), algName));
        };
    }

    if (s.length + 2 * hashLen + 2 > n) {
        throw "Message too long for RSA";
    }

    var PS = '', i;

    for (i = 0; i < n - s.length - 2 * hashLen - 2; i += 1) {
        PS += '\x00';
    }

    var DB = hash('') + PS + '\x01' + s;
    var seed = new Array(hashLen);
    new SecureRandom().nextBytes(seed);
    
    var dbMask = oaep_mgf1_arr(seed, DB.length, hash);
    var maskedDB = [];

    for (i = 0; i < DB.length; i += 1) {
        maskedDB[i] = DB.charCodeAt(i) ^ dbMask.charCodeAt(i);
    }

    var seedMask = oaep_mgf1_arr(maskedDB, seed.length, hash);
    var maskedSeed = [0];

    for (i = 0; i < seed.length; i += 1) {
        maskedSeed[i + 1] = seed[i] ^ seedMask.charCodeAt(i);
    }

    return new BigInteger(maskedSeed.concat(maskedDB));
}

// "empty" RSA key constructor
function RSAKey() {
  this.n = null;
  this.e = 0;
  this.d = null;
  this.p = null;
  this.q = null;
  this.dmp1 = null;
  this.dmq1 = null;
  this.coeff = null;
}

// Set the public key fields N and e from hex strings
function RSASetPublic(N, E) {
    this.isPublic = true;
    this.isPrivate = false;
    if (typeof N !== "string") {
	this.n = N;
	this.e = E;
    } else if(N != null && E != null && N.length > 0 && E.length > 0) {
	this.n = parseBigInt(N,16);
	this.e = parseInt(E,16);
    } else {
	throw "Invalid RSA public key";
    }
}

// Perform raw public operation on "x": return x^e (mod n)
function RSADoPublic(x) {
  return x.modPowInt(this.e, this.n);
}

// Return the PKCS#1 RSA encryption of "text" as an even-length hex string
function RSAEncrypt(text) {
  var m = pkcs1pad2(text,(this.n.bitLength()+7)>>3);
  if(m == null) return null;
  var c = this.doPublic(m);
  if(c == null) return null;
  var h = c.toString(16);
  if((h.length & 1) == 0) return h; else return "0" + h;
}

// Return the PKCS#1 OAEP RSA encryption of "text" as an even-length hex string
function RSAEncryptOAEP(text, hash, hashLen) {
  var m = oaep_pad(text, (this.n.bitLength() + 7) >> 3, hash, hashLen);
  if(m == null) return null;
  var c = this.doPublic(m);
  if(c == null) return null;
  var h = c.toString(16);
  if((h.length & 1) == 0) return h; else return "0" + h;
}

// Return the PKCS#1 RSA encryption of "text" as a Base64-encoded string
//function RSAEncryptB64(text) {
//  var h = this.encrypt(text);
//  if(h) return hex2b64(h); else return null;
//}

// protected
RSAKey.prototype.doPublic = RSADoPublic;

// public
RSAKey.prototype.setPublic = RSASetPublic;
RSAKey.prototype.encrypt = RSAEncrypt;
RSAKey.prototype.encryptOAEP = RSAEncryptOAEP;
//RSAKey.prototype.encrypt_b64 = RSAEncryptB64;

RSAKey.prototype.type = "RSA";
/*! (c) Tom Wu | http://www-cs-students.stanford.edu/~tjw/jsbn/
 */
// Depends on rsa.js and jsbn2.js

// Version 1.1: support utf-8 decoding in pkcs1unpad2

// Undo PKCS#1 (type 2, random) padding and, if valid, return the plaintext
function pkcs1unpad2(d,n) {
  var b = d.toByteArray();
  var i = 0;
  while(i < b.length && b[i] == 0) ++i;
  if(b.length-i != n-1 || b[i] != 2)
    return null;
  ++i;
  while(b[i] != 0)
    if(++i >= b.length) return null;
  var ret = "";
  while(++i < b.length) {
    var c = b[i] & 255;
    if(c < 128) { // utf-8 decode
      ret += String.fromCharCode(c);
    }
    else if((c > 191) && (c < 224)) {
      ret += String.fromCharCode(((c & 31) << 6) | (b[i+1] & 63));
      ++i;
    }
    else {
      ret += String.fromCharCode(((c & 15) << 12) | ((b[i+1] & 63) << 6) | (b[i+2] & 63));
      i += 2;
    }
  }
  return ret;
}

// PKCS#1 (OAEP) mask generation function
function oaep_mgf1_str(seed, len, hash)
{
    var mask = '', i = 0;

    while (mask.length < len)
    {
        mask += hash(seed + String.fromCharCode.apply(String, [
                (i & 0xff000000) >> 24,
                (i & 0x00ff0000) >> 16,
                (i & 0x0000ff00) >> 8,
                i & 0x000000ff]));
        i += 1;
    }

    return mask;
}

/**
 * Undo PKCS#1 (OAEP) padding and, if valid, return the plaintext
 * @name oaep_unpad
 * @param {BigInteger} d BigInteger object of OAEP padded message
 * @param n byte length of RSA key (i.e. 128 when RSA 1024bit)
 * @param hash JavaScript function to calculate raw hash value from raw string or algorithm name (ex. "SHA1") 
 * @param hashLen byte length of resulted hash value (i.e. 20 for SHA1)
 * @return {String} raw string of OAEP unpadded message
 * @description
 * This function do unpadding OAEP padded message then returns an original message.<br/>
 * NOTE: Since jsrsasign 6.2.0, 'hash' argument can accept an algorithm name such as "sha1".
 * @example
 * // DEFAULT(SHA1)
 * bi1 = oaep_pad("aaa", 128);
 * oaep_unpad(bi1, 128) &rarr; "aaa" // SHA-1 by default
 */
function oaep_unpad(d, n, hash, hashLen) {
    var MD = KJUR.crypto.MessageDigest;
    var Util = KJUR.crypto.Util;
    var algName = null;

    if (!hash) hash = "sha1";

    if (typeof hash === "string") {
        algName = MD.getCanonicalAlgName(hash);
        hashLen = MD.getHashLength(algName);
        hash = function(s) {
            return hextorstr(Util.hashHex(rstrtohex(s), algName));
        };
    }

    d = d.toByteArray();

    var i;

    for (i = 0; i < d.length; i += 1) {
        d[i] &= 0xff;
    }

    while (d.length < n) {
        d.unshift(0);
    }

    d = String.fromCharCode.apply(String, d);

    if (d.length < 2 * hashLen + 2) {
        throw "Cipher too short";
    }

    var maskedSeed = d.substr(1, hashLen)
    var maskedDB = d.substr(hashLen + 1);

    var seedMask = oaep_mgf1_str(maskedDB, hashLen, hash);
    var seed = [], i;

    for (i = 0; i < maskedSeed.length; i += 1) {
        seed[i] = maskedSeed.charCodeAt(i) ^ seedMask.charCodeAt(i);
    }

    var dbMask = oaep_mgf1_str(String.fromCharCode.apply(String, seed),
                               d.length - hashLen, hash);

    var DB = [];

    for (i = 0; i < maskedDB.length; i += 1) {
        DB[i] = maskedDB.charCodeAt(i) ^ dbMask.charCodeAt(i);
    }

    DB = String.fromCharCode.apply(String, DB);

    if (DB.substr(0, hashLen) !== hash('')) {
        throw "Hash mismatch";
    }

    DB = DB.substr(hashLen);

    var first_one = DB.indexOf('\x01');
    var last_zero = (first_one != -1) ? DB.substr(0, first_one).lastIndexOf('\x00') : -1;

    if (last_zero + 1 != first_one) {
        throw "Malformed data";
    }

    return DB.substr(first_one + 1);
}

// Set the private key fields N, e, and d from hex strings
function RSASetPrivate(N,E,D) {
  this.isPrivate = true;
  if (typeof N !== "string")
  {
    this.n = N;
    this.e = E;
    this.d = D;
  }
  else if(N != null && E != null && N.length > 0 && E.length > 0) {
    this.n = parseBigInt(N,16);
    this.e = parseInt(E,16);
    this.d = parseBigInt(D,16);
  }
  else
    throw "Invalid RSA private key";
}

// Set the private key fields N, e, d and CRT params from hex strings
function RSASetPrivateEx(N,E,D,P,Q,DP,DQ,C) {
  this.isPrivate = true;
  this.isPublic = false;
  if (N == null) throw "RSASetPrivateEx N == null";
  if (E == null) throw "RSASetPrivateEx E == null";
  if (N.length == 0) throw "RSASetPrivateEx N.length == 0";
  if (E.length == 0) throw "RSASetPrivateEx E.length == 0";

  if (N != null && E != null && N.length > 0 && E.length > 0) {
    this.n = parseBigInt(N,16);
    this.e = parseInt(E,16);
    this.d = parseBigInt(D,16);
    this.p = parseBigInt(P,16);
    this.q = parseBigInt(Q,16);
    this.dmp1 = parseBigInt(DP,16);
    this.dmq1 = parseBigInt(DQ,16);
    this.coeff = parseBigInt(C,16);
  } else {
    throw "Invalid RSA private key in RSASetPrivateEx";
  }
}

// Generate a new random private key B bits long, using public expt E
function RSAGenerate(B,E) {
  var rng = new SecureRandom();
  var qs = B>>1;
  this.e = parseInt(E,16);
  var ee = new BigInteger(E,16);
  for(;;) {
    for(;;) {
      this.p = new BigInteger(B-qs,1,rng);
      if(this.p.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && this.p.isProbablePrime(10)) break;
    }
    for(;;) {
      this.q = new BigInteger(qs,1,rng);
      if(this.q.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && this.q.isProbablePrime(10)) break;
    }
    if(this.p.compareTo(this.q) <= 0) {
      var t = this.p;
      this.p = this.q;
      this.q = t;
    }
    var p1 = this.p.subtract(BigInteger.ONE);	// p1 = p - 1
    var q1 = this.q.subtract(BigInteger.ONE);	// q1 = q - 1
    var phi = p1.multiply(q1);
    if(phi.gcd(ee).compareTo(BigInteger.ONE) == 0) {
      this.n = this.p.multiply(this.q);	// this.n = p * q
      this.d = ee.modInverse(phi);	// this.d = 
      this.dmp1 = this.d.mod(p1);	// this.dmp1 = d mod (p - 1)
      this.dmq1 = this.d.mod(q1);	// this.dmq1 = d mod (q - 1)
      this.coeff = this.q.modInverse(this.p);	// this.coeff = (q ^ -1) mod p
      break;
    }
  }
  this.isPrivate = true;
}

// Perform raw private operation on "x": return x^d (mod n)
function RSADoPrivate(x) {
  if(this.p == null || this.q == null)
    return x.modPow(this.d, this.n);

  // TODO: re-calculate any missing CRT params
  var xp = x.mod(this.p).modPow(this.dmp1, this.p); // xp=cp?
  var xq = x.mod(this.q).modPow(this.dmq1, this.q); // xq=cq?

  while(xp.compareTo(xq) < 0)
    xp = xp.add(this.p);
  // NOTE:
  // xp.subtract(xq) => cp -cq
  // xp.subtract(xq).multiply(this.coeff).mod(this.p) => (cp - cq) * u mod p = h
  // xp.subtract(xq).multiply(this.coeff).mod(this.p).multiply(this.q).add(xq) => cq + (h * q) = M
  return xp.subtract(xq).multiply(this.coeff).mod(this.p).multiply(this.q).add(xq);
}

// Return the PKCS#1 RSA decryption of "ctext".
// "ctext" is an even-length hex string and the output is a plain string.
function RSADecrypt(ctext) {
  var c = parseBigInt(ctext, 16);
  var m = this.doPrivate(c);
  if(m == null) return null;
  return pkcs1unpad2(m, (this.n.bitLength()+7)>>3);
}

// Return the PKCS#1 OAEP RSA decryption of "ctext".
// "ctext" is an even-length hex string and the output is a plain string.
function RSADecryptOAEP(ctext, hash, hashLen) {
  var c = parseBigInt(ctext, 16);
  var m = this.doPrivate(c);
  if(m == null) return null;
  return oaep_unpad(m, (this.n.bitLength()+7)>>3, hash, hashLen);
}

// Return the PKCS#1 RSA decryption of "ctext".
// "ctext" is a Base64-encoded string and the output is a plain string.
//function RSAB64Decrypt(ctext) {
//  var h = b64tohex(ctext);
//  if(h) return this.decrypt(h); else return null;
//}

// protected
RSAKey.prototype.doPrivate = RSADoPrivate;

// public
RSAKey.prototype.setPrivate = RSASetPrivate;
RSAKey.prototype.setPrivateEx = RSASetPrivateEx;
RSAKey.prototype.generate = RSAGenerate;
RSAKey.prototype.decrypt = RSADecrypt;
RSAKey.prototype.decryptOAEP = RSADecryptOAEP;
//RSAKey.prototype.b64_decrypt = RSAB64Decrypt;
/* asn1-1.0.14.js (c) 2013-2018 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * asn1.js - ASN.1 DER encoder classes
 *
 * Copyright (c) 2013-2018 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name asn1-1.0.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version asn1 1.0.14 (2018-Apr-03)
 * @since jsrsasign 2.1
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

/** 
 * kjur's class library name space
 * <p>
 * This name space provides following name spaces:
 * <ul>
 * <li>{@link KJUR.asn1} - ASN.1 primitive hexadecimal encoder</li>
 * <li>{@link KJUR.asn1.x509} - ASN.1 structure for X.509 certificate and CRL</li>
 * <li>{@link KJUR.crypto} - Java Cryptographic Extension(JCE) style MessageDigest/Signature 
 * class and utilities</li>
 * </ul>
 * </p> 
 * NOTE: Please ignore method summary and document of this namespace. This caused by a bug of jsdoc2.
 * @name KJUR
 * @namespace kjur's class library name space
 */
if (typeof KJUR == "undefined" || !KJUR) KJUR = {};

/**
 * kjur's ASN.1 class library name space
 * <p>
 * This is ITU-T X.690 ASN.1 DER encoder class library and
 * class structure and methods is very similar to 
 * org.bouncycastle.asn1 package of 
 * well known BouncyCaslte Cryptography Library.
 * <h4>PROVIDING ASN.1 PRIMITIVES</h4>
 * Here are ASN.1 DER primitive classes.
 * <ul>
 * <li>0x01 {@link KJUR.asn1.DERBoolean}</li>
 * <li>0x02 {@link KJUR.asn1.DERInteger}</li>
 * <li>0x03 {@link KJUR.asn1.DERBitString}</li>
 * <li>0x04 {@link KJUR.asn1.DEROctetString}</li>
 * <li>0x05 {@link KJUR.asn1.DERNull}</li>
 * <li>0x06 {@link KJUR.asn1.DERObjectIdentifier}</li>
 * <li>0x0a {@link KJUR.asn1.DEREnumerated}</li>
 * <li>0x0c {@link KJUR.asn1.DERUTF8String}</li>
 * <li>0x12 {@link KJUR.asn1.DERNumericString}</li>
 * <li>0x13 {@link KJUR.asn1.DERPrintableString}</li>
 * <li>0x14 {@link KJUR.asn1.DERTeletexString}</li>
 * <li>0x16 {@link KJUR.asn1.DERIA5String}</li>
 * <li>0x17 {@link KJUR.asn1.DERUTCTime}</li>
 * <li>0x18 {@link KJUR.asn1.DERGeneralizedTime}</li>
 * <li>0x30 {@link KJUR.asn1.DERSequence}</li>
 * <li>0x31 {@link KJUR.asn1.DERSet}</li>
 * </ul>
 * <h4>OTHER ASN.1 CLASSES</h4>
 * <ul>
 * <li>{@link KJUR.asn1.ASN1Object}</li>
 * <li>{@link KJUR.asn1.DERAbstractString}</li>
 * <li>{@link KJUR.asn1.DERAbstractTime}</li>
 * <li>{@link KJUR.asn1.DERAbstractStructured}</li>
 * <li>{@link KJUR.asn1.DERTaggedObject}</li>
 * </ul>
 * <h4>SUB NAME SPACES</h4>
 * <ul>
 * <li>{@link KJUR.asn1.cades} - CAdES long term signature format</li>
 * <li>{@link KJUR.asn1.cms} - Cryptographic Message Syntax</li>
 * <li>{@link KJUR.asn1.csr} - Certificate Signing Request (CSR/PKCS#10)</li>
 * <li>{@link KJUR.asn1.tsp} - RFC 3161 Timestamping Protocol Format</li>
 * <li>{@link KJUR.asn1.x509} - RFC 5280 X.509 certificate and CRL</li>
 * </ul>
 * </p>
 * NOTE: Please ignore method summary and document of this namespace. 
 * This caused by a bug of jsdoc2.
 * @name KJUR.asn1
 * @namespace
 */
if (typeof KJUR.asn1 == "undefined" || !KJUR.asn1) KJUR.asn1 = {};

/**
 * ASN1 utilities class
 * @name KJUR.asn1.ASN1Util
 * @class ASN1 utilities class
 * @since asn1 1.0.2
 */
KJUR.asn1.ASN1Util = new function() {
    this.integerToByteHex = function(i) {
        var h = i.toString(16);
        if ((h.length % 2) == 1) h = '0' + h;
        return h;
    };
    this.bigIntToMinTwosComplementsHex = function(bigIntegerValue) {
        var h = bigIntegerValue.toString(16);
        if (h.substr(0, 1) != '-') {
            if (h.length % 2 == 1) {
                h = '0' + h;
            } else {
                if (! h.match(/^[0-7]/)) {
                    h = '00' + h;
                }
            }
        } else {
            var hPos = h.substr(1);
            var xorLen = hPos.length;
            if (xorLen % 2 == 1) {
                xorLen += 1;
            } else {
                if (! h.match(/^[0-7]/)) {
                    xorLen += 2;
                }
            }
            var hMask = '';
            for (var i = 0; i < xorLen; i++) {
                hMask += 'f';
            }
            var biMask = new BigInteger(hMask, 16);
            var biNeg = biMask.xor(bigIntegerValue).add(BigInteger.ONE);
            h = biNeg.toString(16).replace(/^-/, '');
        }
        return h;
    };
    /**
     * get PEM string from hexadecimal data and header string
     * @name getPEMStringFromHex
     * @memberOf KJUR.asn1.ASN1Util
     * @function
     * @param {String} dataHex hexadecimal string of PEM body
     * @param {String} pemHeader PEM header string (ex. 'RSA PRIVATE KEY')
     * @return {String} PEM formatted string of input data
     * @description
     * This method converts a hexadecimal string to a PEM string with
     * a specified header. Its line break will be CRLF("\r\n").
     * @example
     * var pem  = KJUR.asn1.ASN1Util.getPEMStringFromHex('616161', 'RSA PRIVATE KEY');
     * // value of pem will be:
     * -----BEGIN PRIVATE KEY-----
     * YWFh
     * -----END PRIVATE KEY-----
     */
    this.getPEMStringFromHex = function(dataHex, pemHeader) {
	return hextopem(dataHex, pemHeader);
    };

    /**
     * generate ASN1Object specifed by JSON parameters
     * @name newObject
     * @memberOf KJUR.asn1.ASN1Util
     * @function
     * @param {Array} param JSON parameter to generate ASN1Object
     * @return {KJUR.asn1.ASN1Object} generated object
     * @since asn1 1.0.3
     * @description
     * generate any ASN1Object specified by JSON param
     * including ASN.1 primitive or structured.
     * Generally 'param' can be described as follows:
     * <blockquote>
     * {TYPE-OF-ASNOBJ: ASN1OBJ-PARAMETER}
     * </blockquote>
     * 'TYPE-OF-ASN1OBJ' can be one of following symbols:
     * <ul>
     * <li>'bool' - DERBoolean</li>
     * <li>'int' - DERInteger</li>
     * <li>'bitstr' - DERBitString</li>
     * <li>'octstr' - DEROctetString</li>
     * <li>'null' - DERNull</li>
     * <li>'oid' - DERObjectIdentifier</li>
     * <li>'enum' - DEREnumerated</li>
     * <li>'utf8str' - DERUTF8String</li>
     * <li>'numstr' - DERNumericString</li>
     * <li>'prnstr' - DERPrintableString</li>
     * <li>'telstr' - DERTeletexString</li>
     * <li>'ia5str' - DERIA5String</li>
     * <li>'utctime' - DERUTCTime</li>
     * <li>'gentime' - DERGeneralizedTime</li>
     * <li>'seq' - DERSequence</li>
     * <li>'set' - DERSet</li>
     * <li>'tag' - DERTaggedObject</li>
     * </ul>
     * @example
     * newObject({'prnstr': 'aaa'});
     * newObject({'seq': [{'int': 3}, {'prnstr': 'aaa'}]})
     * // ASN.1 Tagged Object
     * newObject({'tag': {'tag': 'a1', 
     *                    'explicit': true,
     *                    'obj': {'seq': [{'int': 3}, {'prnstr': 'aaa'}]}}});
     * // more simple representation of ASN.1 Tagged Object
     * newObject({'tag': ['a1',
     *                    true,
     *                    {'seq': [
     *                      {'int': 3}, 
     *                      {'prnstr': 'aaa'}]}
     *                   ]});
     */
    this.newObject = function(param) {
	var _KJUR = KJUR,
	    _KJUR_asn1 = _KJUR.asn1,
	    _DERBoolean = _KJUR_asn1.DERBoolean,
	    _DERInteger = _KJUR_asn1.DERInteger,
	    _DERBitString = _KJUR_asn1.DERBitString,
	    _DEROctetString = _KJUR_asn1.DEROctetString,
	    _DERNull = _KJUR_asn1.DERNull,
	    _DERObjectIdentifier = _KJUR_asn1.DERObjectIdentifier,
	    _DEREnumerated = _KJUR_asn1.DEREnumerated,
	    _DERUTF8String = _KJUR_asn1.DERUTF8String,
	    _DERNumericString = _KJUR_asn1.DERNumericString,
	    _DERPrintableString = _KJUR_asn1.DERPrintableString,
	    _DERTeletexString = _KJUR_asn1.DERTeletexString,
	    _DERIA5String = _KJUR_asn1.DERIA5String,
	    _DERUTCTime = _KJUR_asn1.DERUTCTime,
	    _DERGeneralizedTime = _KJUR_asn1.DERGeneralizedTime,
	    _DERSequence = _KJUR_asn1.DERSequence,
	    _DERSet = _KJUR_asn1.DERSet,
	    _DERTaggedObject = _KJUR_asn1.DERTaggedObject,
	    _newObject = _KJUR_asn1.ASN1Util.newObject;

        var keys = Object.keys(param);
        if (keys.length != 1)
            throw "key of param shall be only one.";
        var key = keys[0];

        if (":bool:int:bitstr:octstr:null:oid:enum:utf8str:numstr:prnstr:telstr:ia5str:utctime:gentime:seq:set:tag:".indexOf(":" + key + ":") == -1)
            throw "undefined key: " + key;

        if (key == "bool")    return new _DERBoolean(param[key]);
        if (key == "int")     return new _DERInteger(param[key]);
        if (key == "bitstr")  return new _DERBitString(param[key]);
        if (key == "octstr")  return new _DEROctetString(param[key]);
        if (key == "null")    return new _DERNull(param[key]);
        if (key == "oid")     return new _DERObjectIdentifier(param[key]);
        if (key == "enum")    return new _DEREnumerated(param[key]);
        if (key == "utf8str") return new _DERUTF8String(param[key]);
        if (key == "numstr")  return new _DERNumericString(param[key]);
        if (key == "prnstr")  return new _DERPrintableString(param[key]);
        if (key == "telstr")  return new _DERTeletexString(param[key]);
        if (key == "ia5str")  return new _DERIA5String(param[key]);
        if (key == "utctime") return new _DERUTCTime(param[key]);
        if (key == "gentime") return new _DERGeneralizedTime(param[key]);

        if (key == "seq") {
            var paramList = param[key];
            var a = [];
            for (var i = 0; i < paramList.length; i++) {
                var asn1Obj = _newObject(paramList[i]);
                a.push(asn1Obj);
            }
            return new _DERSequence({'array': a});
        }

        if (key == "set") {
            var paramList = param[key];
            var a = [];
            for (var i = 0; i < paramList.length; i++) {
                var asn1Obj = _newObject(paramList[i]);
                a.push(asn1Obj);
            }
            return new _DERSet({'array': a});
        }

        if (key == "tag") {
            var tagParam = param[key];
            if (Object.prototype.toString.call(tagParam) === '[object Array]' &&
                tagParam.length == 3) {
                var obj = _newObject(tagParam[2]);
                return new _DERTaggedObject({tag: tagParam[0],
					     explicit: tagParam[1],
					     obj: obj});
            } else {
                var newParam = {};
                if (tagParam.explicit !== undefined)
                    newParam.explicit = tagParam.explicit;
                if (tagParam.tag !== undefined)
                    newParam.tag = tagParam.tag;
                if (tagParam.obj === undefined)
                    throw "obj shall be specified for 'tag'.";
                newParam.obj = _newObject(tagParam.obj);
                return new _DERTaggedObject(newParam);
            }
        }
    };

    /**
     * get encoded hexadecimal string of ASN1Object specifed by JSON parameters
     * @name jsonToASN1HEX
     * @memberOf KJUR.asn1.ASN1Util
     * @function
     * @param {Array} param JSON parameter to generate ASN1Object
     * @return hexadecimal string of ASN1Object
     * @since asn1 1.0.4
     * @description
     * As for ASN.1 object representation of JSON object,
     * please see {@link newObject}.
     * @example
     * jsonToASN1HEX({'prnstr': 'aaa'}); 
     */
    this.jsonToASN1HEX = function(param) {
        var asn1Obj = this.newObject(param);
        return asn1Obj.getEncodedHex();
    };
};

/**
 * get dot noted oid number string from hexadecimal value of OID
 * @name oidHexToInt
 * @memberOf KJUR.asn1.ASN1Util
 * @function
 * @param {String} hex hexadecimal value of object identifier
 * @return {String} dot noted string of object identifier
 * @since jsrsasign 4.8.3 asn1 1.0.7
 * @description
 * This static method converts from hexadecimal string representation of 
 * ASN.1 value of object identifier to oid number string.
 * @example
 * KJUR.asn1.ASN1Util.oidHexToInt('550406') &rarr; "2.5.4.6"
 */
KJUR.asn1.ASN1Util.oidHexToInt = function(hex) {
    var s = "";
    var i01 = parseInt(hex.substr(0, 2), 16);
    var i0 = Math.floor(i01 / 40);
    var i1 = i01 % 40;
    var s = i0 + "." + i1;

    var binbuf = "";
    for (var i = 2; i < hex.length; i += 2) {
	var value = parseInt(hex.substr(i, 2), 16);
        var bin = ("00000000" + value.toString(2)).slice(- 8);
	binbuf = binbuf + bin.substr(1, 7);
	if (bin.substr(0, 1) == "0") {
	    var bi = new BigInteger(binbuf, 2);
	    s = s + "." + bi.toString(10);
	    binbuf = "";
	}
    };

    return s;
};

/**
 * get hexadecimal value of object identifier from dot noted oid value
 * @name oidIntToHex
 * @memberOf KJUR.asn1.ASN1Util
 * @function
 * @param {String} oidString dot noted string of object identifier
 * @return {String} hexadecimal value of object identifier
 * @since jsrsasign 4.8.3 asn1 1.0.7
 * @description
 * This static method converts from object identifier value string.
 * to hexadecimal string representation of it.
 * @example
 * KJUR.asn1.ASN1Util.oidIntToHex("2.5.4.6") &rarr; "550406"
 */
KJUR.asn1.ASN1Util.oidIntToHex = function(oidString) {
    var itox = function(i) {
        var h = i.toString(16);
        if (h.length == 1) h = '0' + h;
        return h;
    };

    var roidtox = function(roid) {
        var h = '';
        var bi = new BigInteger(roid, 10);
        var b = bi.toString(2);
        var padLen = 7 - b.length % 7;
        if (padLen == 7) padLen = 0;
        var bPad = '';
        for (var i = 0; i < padLen; i++) bPad += '0';
        b = bPad + b;
        for (var i = 0; i < b.length - 1; i += 7) {
            var b8 = b.substr(i, 7);
            if (i != b.length - 7) b8 = '1' + b8;
            h += itox(parseInt(b8, 2));
        }
        return h;
    };
    
    if (! oidString.match(/^[0-9.]+$/)) {
        throw "malformed oid string: " + oidString;
    }
    var h = '';
    var a = oidString.split('.');
    var i0 = parseInt(a[0]) * 40 + parseInt(a[1]);
    h += itox(i0);
    a.splice(0, 2);
    for (var i = 0; i < a.length; i++) {
        h += roidtox(a[i]);
    }
    return h;
};


// ********************************************************************
//  Abstract ASN.1 Classes
// ********************************************************************

// ********************************************************************

/**
 * base class for ASN.1 DER encoder object
 * @name KJUR.asn1.ASN1Object
 * @class base class for ASN.1 DER encoder object
 * @property {Boolean} isModified flag whether internal data was changed
 * @property {String} hTLV hexadecimal string of ASN.1 TLV
 * @property {String} hT hexadecimal string of ASN.1 TLV tag(T)
 * @property {String} hL hexadecimal string of ASN.1 TLV length(L)
 * @property {String} hV hexadecimal string of ASN.1 TLV value(V)
 * @description
 */
KJUR.asn1.ASN1Object = function() {
    var isModified = true;
    var hTLV = null;
    var hT = '00';
    var hL = '00';
    var hV = '';

    /**
     * get hexadecimal ASN.1 TLV length(L) bytes from TLV value(V)
     * @name getLengthHexFromValue
     * @memberOf KJUR.asn1.ASN1Object#
     * @function
     * @return {String} hexadecimal string of ASN.1 TLV length(L)
     */
    this.getLengthHexFromValue = function() {
        if (typeof this.hV == "undefined" || this.hV == null) {
            throw "this.hV is null or undefined.";
        }
        if (this.hV.length % 2 == 1) {
            throw "value hex must be even length: n=" + hV.length + ",v=" + this.hV;
        }
        var n = this.hV.length / 2;
        var hN = n.toString(16);
        if (hN.length % 2 == 1) {
            hN = "0" + hN;
        }
        if (n < 128) {
            return hN;
        } else {
            var hNlen = hN.length / 2;
            if (hNlen > 15) {
                throw "ASN.1 length too long to represent by 8x: n = " + n.toString(16);
            }
            var head = 128 + hNlen;
            return head.toString(16) + hN;
        }
    };

    /**
     * get hexadecimal string of ASN.1 TLV bytes
     * @name getEncodedHex
     * @memberOf KJUR.asn1.ASN1Object#
     * @function
     * @return {String} hexadecimal string of ASN.1 TLV
     */
    this.getEncodedHex = function() {
        if (this.hTLV == null || this.isModified) {
            this.hV = this.getFreshValueHex();
            this.hL = this.getLengthHexFromValue();
            this.hTLV = this.hT + this.hL + this.hV;
            this.isModified = false;
            //alert("first time: " + this.hTLV);
        }
        return this.hTLV;
    };

    /**
     * get hexadecimal string of ASN.1 TLV value(V) bytes
     * @name getValueHex
     * @memberOf KJUR.asn1.ASN1Object#
     * @function
     * @return {String} hexadecimal string of ASN.1 TLV value(V) bytes
     */
    this.getValueHex = function() {
        this.getEncodedHex();
        return this.hV;
    }

    this.getFreshValueHex = function() {
        return '';
    };
};

// == BEGIN DERAbstractString ================================================
/**
 * base class for ASN.1 DER string classes
 * @name KJUR.asn1.DERAbstractString
 * @class base class for ASN.1 DER string classes
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @property {String} s internal string of value
 * @extends KJUR.asn1.ASN1Object
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>str - specify initial ASN.1 value(V) by a string</li>
 * <li>hex - specify initial ASN.1 value(V) by a hexadecimal string</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 */
KJUR.asn1.DERAbstractString = function(params) {
    KJUR.asn1.DERAbstractString.superclass.constructor.call(this);
    var s = null;
    var hV = null;

    /**
     * get string value of this string object
     * @name getString
     * @memberOf KJUR.asn1.DERAbstractString#
     * @function
     * @return {String} string value of this string object
     */
    this.getString = function() {
        return this.s;
    };

    /**
     * set value by a string
     * @name setString
     * @memberOf KJUR.asn1.DERAbstractString#
     * @function
     * @param {String} newS value by a string to set
     * @description
     * This method set value by string. <br/>
     * NOTE: This method assumes that the argument string is
     * UTF-8 encoded even though ASN.1 primitive 
     * such as IA5String or PrintableString doesn't
     * support all of UTF-8 characters.
     * @example
     * o = new KJUR.asn1.DERIA5String();
     * o.setString("abc");
     * o.setString("あいう");
     */
    this.setString = function(newS) {
        this.hTLV = null;
        this.isModified = true;
        this.s = newS;
        this.hV = utf8tohex(this.s).toLowerCase();
    };

    /**
     * set value by a hexadecimal string
     * @name setStringHex
     * @memberOf KJUR.asn1.DERAbstractString#
     * @function
     * @param {String} newHexString value by a hexadecimal string to set
     */
    this.setStringHex = function(newHexString) {
        this.hTLV = null;
        this.isModified = true;
        this.s = null;
        this.hV = newHexString;
    };

    this.getFreshValueHex = function() {
        return this.hV;
    };

    if (typeof params != "undefined") {
        if (typeof params == "string") {
            this.setString(params);
        } else if (typeof params['str'] != "undefined") {
            this.setString(params['str']);
        } else if (typeof params['hex'] != "undefined") {
            this.setStringHex(params['hex']);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.DERAbstractString, KJUR.asn1.ASN1Object);
// == END   DERAbstractString ================================================

// == BEGIN DERAbstractTime ==================================================
/**
 * base class for ASN.1 DER Generalized/UTCTime class
 * @name KJUR.asn1.DERAbstractTime
 * @class base class for ASN.1 DER Generalized/UTCTime class
 * @param {Array} params associative array of parameters (ex. {'str': '130430235959Z'})
 * @extends KJUR.asn1.ASN1Object
 * @description
 * @see KJUR.asn1.ASN1Object - superclass
 */
KJUR.asn1.DERAbstractTime = function(params) {
    KJUR.asn1.DERAbstractTime.superclass.constructor.call(this);
    var s = null;
    var date = null;

    // --- PRIVATE METHODS --------------------
    this.localDateToUTC = function(d) {
        utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        var utcDate = new Date(utc);
        return utcDate;
    };

    /*
     * format date string by Data object
     * @name formatDate
     * @memberOf KJUR.asn1.AbstractTime;
     * @param {Date} dateObject 
     * @param {string} type 'utc' or 'gen'
     * @param {boolean} withMillis flag for with millisections or not
     * @description
     * 'withMillis' flag is supported from asn1 1.0.6.
     */
    this.formatDate = function(dateObject, type, withMillis) {
        var pad = this.zeroPadding;
        var d = this.localDateToUTC(dateObject);
        var year = String(d.getFullYear());
        if (type == 'utc') year = year.substr(2, 2);
        var month = pad(String(d.getMonth() + 1), 2);
        var day = pad(String(d.getDate()), 2);
        var hour = pad(String(d.getHours()), 2);
        var min = pad(String(d.getMinutes()), 2);
        var sec = pad(String(d.getSeconds()), 2);
        var s = year + month + day + hour + min + sec;
        if (withMillis === true) {
            var millis = d.getMilliseconds();
            if (millis != 0) {
                var sMillis = pad(String(millis), 3);
                sMillis = sMillis.replace(/[0]+$/, "");
                s = s + "." + sMillis;
            }
        }
        return s + "Z";
    };

    this.zeroPadding = function(s, len) {
        if (s.length >= len) return s;
        return new Array(len - s.length + 1).join('0') + s;
    };

    // --- PUBLIC METHODS --------------------
    /**
     * get string value of this string object
     * @name getString
     * @memberOf KJUR.asn1.DERAbstractTime#
     * @function
     * @return {String} string value of this time object
     */
    this.getString = function() {
        return this.s;
    };

    /**
     * set value by a string
     * @name setString
     * @memberOf KJUR.asn1.DERAbstractTime#
     * @function
     * @param {String} newS value by a string to set such like "130430235959Z"
     */
    this.setString = function(newS) {
        this.hTLV = null;
        this.isModified = true;
        this.s = newS;
        this.hV = stohex(newS);
    };

    /**
     * set value by a Date object
     * @name setByDateValue
     * @memberOf KJUR.asn1.DERAbstractTime#
     * @function
     * @param {Integer} year year of date (ex. 2013)
     * @param {Integer} month month of date between 1 and 12 (ex. 12)
     * @param {Integer} day day of month
     * @param {Integer} hour hours of date
     * @param {Integer} min minutes of date
     * @param {Integer} sec seconds of date
     */
    this.setByDateValue = function(year, month, day, hour, min, sec) {
        var dateObject = new Date(Date.UTC(year, month - 1, day, hour, min, sec, 0));
        this.setByDate(dateObject);
    };

    this.getFreshValueHex = function() {
        return this.hV;
    };
};
YAHOO.lang.extend(KJUR.asn1.DERAbstractTime, KJUR.asn1.ASN1Object);
// == END   DERAbstractTime ==================================================

// == BEGIN DERAbstractStructured ============================================
/**
 * base class for ASN.1 DER structured class
 * @name KJUR.asn1.DERAbstractStructured
 * @class base class for ASN.1 DER structured class
 * @property {Array} asn1Array internal array of ASN1Object
 * @extends KJUR.asn1.ASN1Object
 * @description
 * @see KJUR.asn1.ASN1Object - superclass
 */
KJUR.asn1.DERAbstractStructured = function(params) {
    KJUR.asn1.DERAbstractString.superclass.constructor.call(this);
    var asn1Array = null;

    /**
     * set value by array of ASN1Object
     * @name setByASN1ObjectArray
     * @memberOf KJUR.asn1.DERAbstractStructured#
     * @function
     * @param {array} asn1ObjectArray array of ASN1Object to set
     */
    this.setByASN1ObjectArray = function(asn1ObjectArray) {
        this.hTLV = null;
        this.isModified = true;
        this.asn1Array = asn1ObjectArray;
    };

    /**
     * append an ASN1Object to internal array
     * @name appendASN1Object
     * @memberOf KJUR.asn1.DERAbstractStructured#
     * @function
     * @param {ASN1Object} asn1Object to add
     */
    this.appendASN1Object = function(asn1Object) {
        this.hTLV = null;
        this.isModified = true;
        this.asn1Array.push(asn1Object);
    };

    this.asn1Array = new Array();
    if (typeof params != "undefined") {
        if (typeof params['array'] != "undefined") {
            this.asn1Array = params['array'];
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.DERAbstractStructured, KJUR.asn1.ASN1Object);


// ********************************************************************
//  ASN.1 Object Classes
// ********************************************************************

// ********************************************************************
/**
 * class for ASN.1 DER Boolean
 * @name KJUR.asn1.DERBoolean
 * @class class for ASN.1 DER Boolean
 * @extends KJUR.asn1.ASN1Object
 * @description
 * @see KJUR.asn1.ASN1Object - superclass
 */
KJUR.asn1.DERBoolean = function() {
    KJUR.asn1.DERBoolean.superclass.constructor.call(this);
    this.hT = "01";
    this.hTLV = "0101ff";
};
YAHOO.lang.extend(KJUR.asn1.DERBoolean, KJUR.asn1.ASN1Object);

// ********************************************************************
/**
 * class for ASN.1 DER Integer
 * @name KJUR.asn1.DERInteger
 * @class class for ASN.1 DER Integer
 * @extends KJUR.asn1.ASN1Object
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>int - specify initial ASN.1 value(V) by integer value</li>
 * <li>bigint - specify initial ASN.1 value(V) by BigInteger object</li>
 * <li>hex - specify initial ASN.1 value(V) by a hexadecimal string</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 */
KJUR.asn1.DERInteger = function(params) {
    KJUR.asn1.DERInteger.superclass.constructor.call(this);
    this.hT = "02";

    /**
     * set value by Tom Wu's BigInteger object
     * @name setByBigInteger
     * @memberOf KJUR.asn1.DERInteger#
     * @function
     * @param {BigInteger} bigIntegerValue to set
     */
    this.setByBigInteger = function(bigIntegerValue) {
        this.hTLV = null;
        this.isModified = true;
        this.hV = KJUR.asn1.ASN1Util.bigIntToMinTwosComplementsHex(bigIntegerValue);
    };

    /**
     * set value by integer value
     * @name setByInteger
     * @memberOf KJUR.asn1.DERInteger
     * @function
     * @param {Integer} integer value to set
     */
    this.setByInteger = function(intValue) {
        var bi = new BigInteger(String(intValue), 10);
        this.setByBigInteger(bi);
    };

    /**
     * set value by integer value
     * @name setValueHex
     * @memberOf KJUR.asn1.DERInteger#
     * @function
     * @param {String} hexadecimal string of integer value
     * @description
     * <br/>
     * NOTE: Value shall be represented by minimum octet length of
     * two's complement representation.
     * @example
     * new KJUR.asn1.DERInteger(123);
     * new KJUR.asn1.DERInteger({'int': 123});
     * new KJUR.asn1.DERInteger({'hex': '1fad'});
     */
    this.setValueHex = function(newHexString) {
        this.hV = newHexString;
    };

    this.getFreshValueHex = function() {
        return this.hV;
    };

    if (typeof params != "undefined") {
        if (typeof params['bigint'] != "undefined") {
            this.setByBigInteger(params['bigint']);
        } else if (typeof params['int'] != "undefined") {
            this.setByInteger(params['int']);
        } else if (typeof params == "number") {
            this.setByInteger(params);
        } else if (typeof params['hex'] != "undefined") {
            this.setValueHex(params['hex']);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.DERInteger, KJUR.asn1.ASN1Object);

// ********************************************************************
/**
 * class for ASN.1 DER encoded BitString primitive
 * @name KJUR.asn1.DERBitString
 * @class class for ASN.1 DER encoded BitString primitive
 * @extends KJUR.asn1.ASN1Object
 * @description 
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>bin - specify binary string (ex. '10111')</li>
 * <li>array - specify array of boolean (ex. [true,false,true,true])</li>
 * <li>hex - specify hexadecimal string of ASN.1 value(V) including unused bits</li>
 * <li>obj - specify {@link KJUR.asn1.ASN1Util.newObject} 
 * argument for "BitString encapsulates" structure.</li>
 * </ul>
 * NOTE1: 'params' can be omitted.<br/>
 * NOTE2: 'obj' parameter have been supported since
 * asn1 1.0.11, jsrsasign 6.1.1 (2016-Sep-25).<br/>
 * @example
 * // default constructor
 * o = new KJUR.asn1.DERBitString();
 * // initialize with binary string
 * o = new KJUR.asn1.DERBitString({bin: "1011"});
 * // initialize with boolean array
 * o = new KJUR.asn1.DERBitString({array: [true,false,true,true]});
 * // initialize with hexadecimal string (04 is unused bits)
 * o = new KJUR.asn1.DEROctetString({hex: "04bac0"});
 * // initialize with ASN1Util.newObject argument for encapsulated
 * o = new KJUR.asn1.DERBitString({obj: {seq: [{int: 3}, {prnstr: 'aaa'}]}});
 * // above generates a ASN.1 data like this:
 * // BIT STRING, encapsulates {
 * //   SEQUENCE {
 * //     INTEGER 3
 * //     PrintableString 'aaa'
 * //     }
 * //   } 
 */
KJUR.asn1.DERBitString = function(params) {
    if (params !== undefined && typeof params.obj !== "undefined") {
	var o = KJUR.asn1.ASN1Util.newObject(params.obj);
	params.hex = "00" + o.getEncodedHex();
    }
    KJUR.asn1.DERBitString.superclass.constructor.call(this);
    this.hT = "03";

    /**
     * set ASN.1 value(V) by a hexadecimal string including unused bits
     * @name setHexValueIncludingUnusedBits
     * @memberOf KJUR.asn1.DERBitString#
     * @function
     * @param {String} newHexStringIncludingUnusedBits
     */
    this.setHexValueIncludingUnusedBits = function(newHexStringIncludingUnusedBits) {
        this.hTLV = null;
        this.isModified = true;
        this.hV = newHexStringIncludingUnusedBits;
    };

    /**
     * set ASN.1 value(V) by unused bit and hexadecimal string of value
     * @name setUnusedBitsAndHexValue
     * @memberOf KJUR.asn1.DERBitString#
     * @function
     * @param {Integer} unusedBits
     * @param {String} hValue
     */
    this.setUnusedBitsAndHexValue = function(unusedBits, hValue) {
        if (unusedBits < 0 || 7 < unusedBits) {
            throw "unused bits shall be from 0 to 7: u = " + unusedBits;
        }
        var hUnusedBits = "0" + unusedBits;
        this.hTLV = null;
        this.isModified = true;
        this.hV = hUnusedBits + hValue;
    };

    /**
     * set ASN.1 DER BitString by binary string<br/>
     * @name setByBinaryString
     * @memberOf KJUR.asn1.DERBitString#
     * @function
     * @param {String} binaryString binary value string (i.e. '10111')
     * @description
     * Its unused bits will be calculated automatically by length of 
     * 'binaryValue'. <br/>
     * NOTE: Trailing zeros '0' will be ignored.
     * @example
     * o = new KJUR.asn1.DERBitString();
     * o.setByBooleanArray("01011");
     */
    this.setByBinaryString = function(binaryString) {
        binaryString = binaryString.replace(/0+$/, '');
        var unusedBits = 8 - binaryString.length % 8;
        if (unusedBits == 8) unusedBits = 0;
        for (var i = 0; i <= unusedBits; i++) {
            binaryString += '0';
        }
        var h = '';
        for (var i = 0; i < binaryString.length - 1; i += 8) {
            var b = binaryString.substr(i, 8);
            var x = parseInt(b, 2).toString(16);
            if (x.length == 1) x = '0' + x;
            h += x;  
        }
        this.hTLV = null;
        this.isModified = true;
        this.hV = '0' + unusedBits + h;
    };

    /**
     * set ASN.1 TLV value(V) by an array of boolean<br/>
     * @name setByBooleanArray
     * @memberOf KJUR.asn1.DERBitString#
     * @function
     * @param {array} booleanArray array of boolean (ex. [true, false, true])
     * @description
     * NOTE: Trailing falses will be ignored in the ASN.1 DER Object.
     * @example
     * o = new KJUR.asn1.DERBitString();
     * o.setByBooleanArray([false, true, false, true, true]);
     */
    this.setByBooleanArray = function(booleanArray) {
        var s = '';
        for (var i = 0; i < booleanArray.length; i++) {
            if (booleanArray[i] == true) {
                s += '1';
            } else {
                s += '0';
            }
        }
        this.setByBinaryString(s);
    };

    /**
     * generate an array of falses with specified length<br/>
     * @name newFalseArray
     * @memberOf KJUR.asn1.DERBitString
     * @function
     * @param {Integer} nLength length of array to generate
     * @return {array} array of boolean falses
     * @description
     * This static method may be useful to initialize boolean array.
     * @example
     * o = new KJUR.asn1.DERBitString();
     * o.newFalseArray(3) &rarr; [false, false, false]
     */
    this.newFalseArray = function(nLength) {
        var a = new Array(nLength);
        for (var i = 0; i < nLength; i++) {
            a[i] = false;
        }
        return a;
    };

    this.getFreshValueHex = function() {
        return this.hV;
    };

    if (typeof params != "undefined") {
        if (typeof params == "string" && params.toLowerCase().match(/^[0-9a-f]+$/)) {
            this.setHexValueIncludingUnusedBits(params);
        } else if (typeof params['hex'] != "undefined") {
            this.setHexValueIncludingUnusedBits(params['hex']);
        } else if (typeof params['bin'] != "undefined") {
            this.setByBinaryString(params['bin']);
        } else if (typeof params['array'] != "undefined") {
            this.setByBooleanArray(params['array']);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.DERBitString, KJUR.asn1.ASN1Object);

// ********************************************************************
/**
 * class for ASN.1 DER OctetString<br/>
 * @name KJUR.asn1.DEROctetString
 * @class class for ASN.1 DER OctetString
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @extends KJUR.asn1.DERAbstractString
 * @description
 * This class provides ASN.1 OctetString simple type.<br/>
 * Supported "params" attributes are:
 * <ul>
 * <li>str - to set a string as a value</li>
 * <li>hex - to set a hexadecimal string as a value</li>
 * <li>obj - to set a encapsulated ASN.1 value by JSON object 
 * which is defined in {@link KJUR.asn1.ASN1Util.newObject}</li>
 * </ul>
 * NOTE: A parameter 'obj' have been supported 
 * for "OCTET STRING, encapsulates" structure.
 * since asn1 1.0.11, jsrsasign 6.1.1 (2016-Sep-25).
 * @see KJUR.asn1.DERAbstractString - superclass
 * @example
 * // default constructor
 * o = new KJUR.asn1.DEROctetString();
 * // initialize with string
 * o = new KJUR.asn1.DEROctetString({str: "aaa"});
 * // initialize with hexadecimal string
 * o = new KJUR.asn1.DEROctetString({hex: "616161"});
 * // initialize with ASN1Util.newObject argument 
 * o = new KJUR.asn1.DEROctetString({obj: {seq: [{int: 3}, {prnstr: 'aaa'}]}});
 * // above generates a ASN.1 data like this:
 * // OCTET STRING, encapsulates {
 * //   SEQUENCE {
 * //     INTEGER 3
 * //     PrintableString 'aaa'
 * //     }
 * //   } 
 */
KJUR.asn1.DEROctetString = function(params) {
    if (params !== undefined && typeof params.obj !== "undefined") {
	var o = KJUR.asn1.ASN1Util.newObject(params.obj);
	params.hex = o.getEncodedHex();
    }
    KJUR.asn1.DEROctetString.superclass.constructor.call(this, params);
    this.hT = "04";
};
YAHOO.lang.extend(KJUR.asn1.DEROctetString, KJUR.asn1.DERAbstractString);

// ********************************************************************
/**
 * class for ASN.1 DER Null
 * @name KJUR.asn1.DERNull
 * @class class for ASN.1 DER Null
 * @extends KJUR.asn1.ASN1Object
 * @description
 * @see KJUR.asn1.ASN1Object - superclass
 */
KJUR.asn1.DERNull = function() {
    KJUR.asn1.DERNull.superclass.constructor.call(this);
    this.hT = "05";
    this.hTLV = "0500";
};
YAHOO.lang.extend(KJUR.asn1.DERNull, KJUR.asn1.ASN1Object);

// ********************************************************************
/**
 * class for ASN.1 DER ObjectIdentifier
 * @name KJUR.asn1.DERObjectIdentifier
 * @class class for ASN.1 DER ObjectIdentifier
 * @param {Array} params associative array of parameters (ex. {'oid': '2.5.4.5'})
 * @extends KJUR.asn1.ASN1Object
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>oid - specify initial ASN.1 value(V) by a oid string (ex. 2.5.4.13)</li>
 * <li>hex - specify initial ASN.1 value(V) by a hexadecimal string</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 */
KJUR.asn1.DERObjectIdentifier = function(params) {
    var itox = function(i) {
        var h = i.toString(16);
        if (h.length == 1) h = '0' + h;
        return h;
    };
    var roidtox = function(roid) {
        var h = '';
        var bi = new BigInteger(roid, 10);
        var b = bi.toString(2);
        var padLen = 7 - b.length % 7;
        if (padLen == 7) padLen = 0;
        var bPad = '';
        for (var i = 0; i < padLen; i++) bPad += '0';
        b = bPad + b;
        for (var i = 0; i < b.length - 1; i += 7) {
            var b8 = b.substr(i, 7);
            if (i != b.length - 7) b8 = '1' + b8;
            h += itox(parseInt(b8, 2));
        }
        return h;
    }

    KJUR.asn1.DERObjectIdentifier.superclass.constructor.call(this);
    this.hT = "06";

    /**
     * set value by a hexadecimal string
     * @name setValueHex
     * @memberOf KJUR.asn1.DERObjectIdentifier#
     * @function
     * @param {String} newHexString hexadecimal value of OID bytes
     */
    this.setValueHex = function(newHexString) {
        this.hTLV = null;
        this.isModified = true;
        this.s = null;
        this.hV = newHexString;
    };

    /**
     * set value by a OID string<br/>
     * @name setValueOidString
     * @memberOf KJUR.asn1.DERObjectIdentifier#
     * @function
     * @param {String} oidString OID string (ex. 2.5.4.13)
     * @example
     * o = new KJUR.asn1.DERObjectIdentifier();
     * o.setValueOidString("2.5.4.13");
     */
    this.setValueOidString = function(oidString) {
        if (! oidString.match(/^[0-9.]+$/)) {
            throw "malformed oid string: " + oidString;
        }
        var h = '';
        var a = oidString.split('.');
        var i0 = parseInt(a[0]) * 40 + parseInt(a[1]);
        h += itox(i0);
        a.splice(0, 2);
        for (var i = 0; i < a.length; i++) {
            h += roidtox(a[i]);
        }
        this.hTLV = null;
        this.isModified = true;
        this.s = null;
        this.hV = h;
    };

    /**
     * set value by a OID name
     * @name setValueName
     * @memberOf KJUR.asn1.DERObjectIdentifier#
     * @function
     * @param {String} oidName OID name (ex. 'serverAuth')
     * @since 1.0.1
     * @description
     * OID name shall be defined in 'KJUR.asn1.x509.OID.name2oidList'.
     * Otherwise raise error.
     * @example
     * o = new KJUR.asn1.DERObjectIdentifier();
     * o.setValueName("serverAuth");
     */
    this.setValueName = function(oidName) {
	var oid = KJUR.asn1.x509.OID.name2oid(oidName);
	if (oid !== '') {
            this.setValueOidString(oid);
        } else {
            throw "DERObjectIdentifier oidName undefined: " + oidName;
        }
    };

    this.getFreshValueHex = function() {
        return this.hV;
    };

    if (params !== undefined) {
        if (typeof params === "string") {
	    if (params.match(/^[0-2].[0-9.]+$/)) {
		this.setValueOidString(params);
	    } else {
		this.setValueName(params);
	    }
        } else if (params.oid !== undefined) {
            this.setValueOidString(params.oid);
        } else if (params.hex !== undefined) {
            this.setValueHex(params.hex);
        } else if (params.name !== undefined) {
            this.setValueName(params.name);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.DERObjectIdentifier, KJUR.asn1.ASN1Object);

// ********************************************************************
/**
 * class for ASN.1 DER Enumerated
 * @name KJUR.asn1.DEREnumerated
 * @class class for ASN.1 DER Enumerated
 * @extends KJUR.asn1.ASN1Object
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>int - specify initial ASN.1 value(V) by integer value</li>
 * <li>hex - specify initial ASN.1 value(V) by a hexadecimal string</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 * @example
 * new KJUR.asn1.DEREnumerated(123);
 * new KJUR.asn1.DEREnumerated({int: 123});
 * new KJUR.asn1.DEREnumerated({hex: '1fad'});
 */
KJUR.asn1.DEREnumerated = function(params) {
    KJUR.asn1.DEREnumerated.superclass.constructor.call(this);
    this.hT = "0a";

    /**
     * set value by Tom Wu's BigInteger object
     * @name setByBigInteger
     * @memberOf KJUR.asn1.DEREnumerated#
     * @function
     * @param {BigInteger} bigIntegerValue to set
     */
    this.setByBigInteger = function(bigIntegerValue) {
        this.hTLV = null;
        this.isModified = true;
        this.hV = KJUR.asn1.ASN1Util.bigIntToMinTwosComplementsHex(bigIntegerValue);
    };

    /**
     * set value by integer value
     * @name setByInteger
     * @memberOf KJUR.asn1.DEREnumerated#
     * @function
     * @param {Integer} integer value to set
     */
    this.setByInteger = function(intValue) {
        var bi = new BigInteger(String(intValue), 10);
        this.setByBigInteger(bi);
    };

    /**
     * set value by integer value
     * @name setValueHex
     * @memberOf KJUR.asn1.DEREnumerated#
     * @function
     * @param {String} hexadecimal string of integer value
     * @description
     * <br/>
     * NOTE: Value shall be represented by minimum octet length of
     * two's complement representation.
     */
    this.setValueHex = function(newHexString) {
        this.hV = newHexString;
    };

    this.getFreshValueHex = function() {
        return this.hV;
    };

    if (typeof params != "undefined") {
        if (typeof params['int'] != "undefined") {
            this.setByInteger(params['int']);
        } else if (typeof params == "number") {
            this.setByInteger(params);
        } else if (typeof params['hex'] != "undefined") {
            this.setValueHex(params['hex']);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.DEREnumerated, KJUR.asn1.ASN1Object);

// ********************************************************************
/**
 * class for ASN.1 DER UTF8String
 * @name KJUR.asn1.DERUTF8String
 * @class class for ASN.1 DER UTF8String
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @extends KJUR.asn1.DERAbstractString
 * @description
 * @see KJUR.asn1.DERAbstractString - superclass
 */
KJUR.asn1.DERUTF8String = function(params) {
    KJUR.asn1.DERUTF8String.superclass.constructor.call(this, params);
    this.hT = "0c";
};
YAHOO.lang.extend(KJUR.asn1.DERUTF8String, KJUR.asn1.DERAbstractString);

// ********************************************************************
/**
 * class for ASN.1 DER NumericString
 * @name KJUR.asn1.DERNumericString
 * @class class for ASN.1 DER NumericString
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @extends KJUR.asn1.DERAbstractString
 * @description
 * @see KJUR.asn1.DERAbstractString - superclass
 */
KJUR.asn1.DERNumericString = function(params) {
    KJUR.asn1.DERNumericString.superclass.constructor.call(this, params);
    this.hT = "12";
};
YAHOO.lang.extend(KJUR.asn1.DERNumericString, KJUR.asn1.DERAbstractString);

// ********************************************************************
/**
 * class for ASN.1 DER PrintableString
 * @name KJUR.asn1.DERPrintableString
 * @class class for ASN.1 DER PrintableString
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @extends KJUR.asn1.DERAbstractString
 * @description
 * @see KJUR.asn1.DERAbstractString - superclass
 */
KJUR.asn1.DERPrintableString = function(params) {
    KJUR.asn1.DERPrintableString.superclass.constructor.call(this, params);
    this.hT = "13";
};
YAHOO.lang.extend(KJUR.asn1.DERPrintableString, KJUR.asn1.DERAbstractString);

// ********************************************************************
/**
 * class for ASN.1 DER TeletexString
 * @name KJUR.asn1.DERTeletexString
 * @class class for ASN.1 DER TeletexString
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @extends KJUR.asn1.DERAbstractString
 * @description
 * @see KJUR.asn1.DERAbstractString - superclass
 */
KJUR.asn1.DERTeletexString = function(params) {
    KJUR.asn1.DERTeletexString.superclass.constructor.call(this, params);
    this.hT = "14";
};
YAHOO.lang.extend(KJUR.asn1.DERTeletexString, KJUR.asn1.DERAbstractString);

// ********************************************************************
/**
 * class for ASN.1 DER IA5String
 * @name KJUR.asn1.DERIA5String
 * @class class for ASN.1 DER IA5String
 * @param {Array} params associative array of parameters (ex. {'str': 'aaa'})
 * @extends KJUR.asn1.DERAbstractString
 * @description
 * @see KJUR.asn1.DERAbstractString - superclass
 */
KJUR.asn1.DERIA5String = function(params) {
    KJUR.asn1.DERIA5String.superclass.constructor.call(this, params);
    this.hT = "16";
};
YAHOO.lang.extend(KJUR.asn1.DERIA5String, KJUR.asn1.DERAbstractString);

// ********************************************************************
/**
 * class for ASN.1 DER UTCTime
 * @name KJUR.asn1.DERUTCTime
 * @class class for ASN.1 DER UTCTime
 * @param {Array} params associative array of parameters (ex. {'str': '130430235959Z'})
 * @extends KJUR.asn1.DERAbstractTime
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>str - specify initial ASN.1 value(V) by a string (ex.'130430235959Z')</li>
 * <li>hex - specify initial ASN.1 value(V) by a hexadecimal string</li>
 * <li>date - specify Date object.</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 * <h4>EXAMPLES</h4>
 * @example
 * d1 = new KJUR.asn1.DERUTCTime();
 * d1.setString('130430125959Z');
 *
 * d2 = new KJUR.asn1.DERUTCTime({'str': '130430125959Z'});
 * d3 = new KJUR.asn1.DERUTCTime({'date': new Date(Date.UTC(2015, 0, 31, 0, 0, 0, 0))});
 * d4 = new KJUR.asn1.DERUTCTime('130430125959Z');
 */
KJUR.asn1.DERUTCTime = function(params) {
    KJUR.asn1.DERUTCTime.superclass.constructor.call(this, params);
    this.hT = "17";

    /**
     * set value by a Date object<br/>
     * @name setByDate
     * @memberOf KJUR.asn1.DERUTCTime#
     * @function
     * @param {Date} dateObject Date object to set ASN.1 value(V)
     * @example
     * o = new KJUR.asn1.DERUTCTime();
     * o.setByDate(new Date("2016/12/31"));
     */
    this.setByDate = function(dateObject) {
        this.hTLV = null;
        this.isModified = true;
        this.date = dateObject;
        this.s = this.formatDate(this.date, 'utc');
        this.hV = stohex(this.s);
    };

    this.getFreshValueHex = function() {
        if (typeof this.date == "undefined" && typeof this.s == "undefined") {
            this.date = new Date();
            this.s = this.formatDate(this.date, 'utc');
            this.hV = stohex(this.s);
        }
        return this.hV;
    };

    if (params !== undefined) {
        if (params.str !== undefined) {
            this.setString(params.str);
        } else if (typeof params == "string" && params.match(/^[0-9]{12}Z$/)) {
            this.setString(params);
        } else if (params.hex !== undefined) {
            this.setStringHex(params.hex);
        } else if (params.date !== undefined) {
            this.setByDate(params.date);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.DERUTCTime, KJUR.asn1.DERAbstractTime);

// ********************************************************************
/**
 * class for ASN.1 DER GeneralizedTime
 * @name KJUR.asn1.DERGeneralizedTime
 * @class class for ASN.1 DER GeneralizedTime
 * @param {Array} params associative array of parameters (ex. {'str': '20130430235959Z'})
 * @property {Boolean} withMillis flag to show milliseconds or not
 * @extends KJUR.asn1.DERAbstractTime
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>str - specify initial ASN.1 value(V) by a string (ex.'20130430235959Z')</li>
 * <li>hex - specify initial ASN.1 value(V) by a hexadecimal string</li>
 * <li>date - specify Date object.</li>
 * <li>millis - specify flag to show milliseconds (from 1.0.6)</li>
 * </ul>
 * NOTE1: 'params' can be omitted.
 * NOTE2: 'withMillis' property is supported from asn1 1.0.6.
 */
KJUR.asn1.DERGeneralizedTime = function(params) {
    KJUR.asn1.DERGeneralizedTime.superclass.constructor.call(this, params);
    this.hT = "18";
    this.withMillis = false;

    /**
     * set value by a Date object
     * @name setByDate
     * @memberOf KJUR.asn1.DERGeneralizedTime#
     * @function
     * @param {Date} dateObject Date object to set ASN.1 value(V)
     * @example
     * When you specify UTC time, use 'Date.UTC' method like this:<br/>
     * o1 = new DERUTCTime();
     * o1.setByDate(date);
     *
     * date = new Date(Date.UTC(2015, 0, 31, 23, 59, 59, 0)); #2015JAN31 23:59:59
     */
    this.setByDate = function(dateObject) {
        this.hTLV = null;
        this.isModified = true;
        this.date = dateObject;
        this.s = this.formatDate(this.date, 'gen', this.withMillis);
        this.hV = stohex(this.s);
    };

    this.getFreshValueHex = function() {
        if (this.date === undefined && this.s === undefined) {
            this.date = new Date();
            this.s = this.formatDate(this.date, 'gen', this.withMillis);
            this.hV = stohex(this.s);
        }
        return this.hV;
    };

    if (params !== undefined) {
        if (params.str !== undefined) {
            this.setString(params.str);
        } else if (typeof params == "string" && params.match(/^[0-9]{14}Z$/)) {
            this.setString(params);
        } else if (params.hex !== undefined) {
            this.setStringHex(params.hex);
        } else if (params.date !== undefined) {
            this.setByDate(params.date);
        }
        if (params.millis === true) {
            this.withMillis = true;
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.DERGeneralizedTime, KJUR.asn1.DERAbstractTime);

// ********************************************************************
/**
 * class for ASN.1 DER Sequence
 * @name KJUR.asn1.DERSequence
 * @class class for ASN.1 DER Sequence
 * @extends KJUR.asn1.DERAbstractStructured
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>array - specify array of ASN1Object to set elements of content</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 */
KJUR.asn1.DERSequence = function(params) {
    KJUR.asn1.DERSequence.superclass.constructor.call(this, params);
    this.hT = "30";
    this.getFreshValueHex = function() {
        var h = '';
        for (var i = 0; i < this.asn1Array.length; i++) {
            var asn1Obj = this.asn1Array[i];
            h += asn1Obj.getEncodedHex();
        }
        this.hV = h;
        return this.hV;
    };
};
YAHOO.lang.extend(KJUR.asn1.DERSequence, KJUR.asn1.DERAbstractStructured);

// ********************************************************************
/**
 * class for ASN.1 DER Set
 * @name KJUR.asn1.DERSet
 * @class class for ASN.1 DER Set
 * @extends KJUR.asn1.DERAbstractStructured
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>array - specify array of ASN1Object to set elements of content</li>
 * <li>sortflag - flag for sort (default: true). ASN.1 BER is not sorted in 'SET OF'.</li>
 * </ul>
 * NOTE1: 'params' can be omitted.<br/>
 * NOTE2: sortflag is supported since 1.0.5.
 */
KJUR.asn1.DERSet = function(params) {
    KJUR.asn1.DERSet.superclass.constructor.call(this, params);
    this.hT = "31";
    this.sortFlag = true; // item shall be sorted only in ASN.1 DER
    this.getFreshValueHex = function() {
        var a = new Array();
        for (var i = 0; i < this.asn1Array.length; i++) {
            var asn1Obj = this.asn1Array[i];
            a.push(asn1Obj.getEncodedHex());
        }
        if (this.sortFlag == true) a.sort();
        this.hV = a.join('');
        return this.hV;
    };

    if (typeof params != "undefined") {
        if (typeof params.sortflag != "undefined" &&
            params.sortflag == false)
            this.sortFlag = false;
    }
};
YAHOO.lang.extend(KJUR.asn1.DERSet, KJUR.asn1.DERAbstractStructured);

// ********************************************************************
/**
 * class for ASN.1 DER TaggedObject
 * @name KJUR.asn1.DERTaggedObject
 * @class class for ASN.1 DER TaggedObject
 * @extends KJUR.asn1.ASN1Object
 * @description
 * <br/>
 * Parameter 'tagNoNex' is ASN.1 tag(T) value for this object.
 * For example, if you find '[1]' tag in a ASN.1 dump, 
 * 'tagNoHex' will be 'a1'.
 * <br/>
 * As for optional argument 'params' for constructor, you can specify *ANY* of
 * following properties:
 * <ul>
 * <li>explicit - specify true if this is explicit tag otherwise false 
 *     (default is 'true').</li>
 * <li>tag - specify tag (default is 'a0' which means [0])</li>
 * <li>obj - specify ASN1Object which is tagged</li>
 * </ul>
 * @example
 * d1 = new KJUR.asn1.DERUTF8String({'str':'a'});
 * d2 = new KJUR.asn1.DERTaggedObject({'obj': d1});
 * hex = d2.getEncodedHex();
 */
KJUR.asn1.DERTaggedObject = function(params) {
    KJUR.asn1.DERTaggedObject.superclass.constructor.call(this);
    this.hT = "a0";
    this.hV = '';
    this.isExplicit = true;
    this.asn1Object = null;

    /**
     * set value by an ASN1Object
     * @name setString
     * @memberOf KJUR.asn1.DERTaggedObject#
     * @function
     * @param {Boolean} isExplicitFlag flag for explicit/implicit tag
     * @param {Integer} tagNoHex hexadecimal string of ASN.1 tag
     * @param {ASN1Object} asn1Object ASN.1 to encapsulate
     */
    this.setASN1Object = function(isExplicitFlag, tagNoHex, asn1Object) {
        this.hT = tagNoHex;
        this.isExplicit = isExplicitFlag;
        this.asn1Object = asn1Object;
        if (this.isExplicit) {
            this.hV = this.asn1Object.getEncodedHex();
            this.hTLV = null;
            this.isModified = true;
        } else {
            this.hV = null;
            this.hTLV = asn1Object.getEncodedHex();
            this.hTLV = this.hTLV.replace(/^../, tagNoHex);
            this.isModified = false;
        }
    };

    this.getFreshValueHex = function() {
        return this.hV;
    };

    if (typeof params != "undefined") {
        if (typeof params['tag'] != "undefined") {
            this.hT = params['tag'];
        }
        if (typeof params['explicit'] != "undefined") {
            this.isExplicit = params['explicit'];
        }
        if (typeof params['obj'] != "undefined") {
            this.asn1Object = params['obj'];
            this.setASN1Object(this.isExplicit, this.hT, this.asn1Object);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.DERTaggedObject, KJUR.asn1.ASN1Object);
/* asn1hex-1.2.0.js (c) 2012-2017 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * asn1hex.js - Hexadecimal represented ASN.1 string library
 *
 * Copyright (c) 2010-2017 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license/
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name asn1hex-1.1.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version asn1hex 1.2.0 (2017-Jun-24)
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

/*
 * MEMO:
 *   f('3082025b02...', 2) ... 82025b ... 3bytes
 *   f('020100', 2) ... 01 ... 1byte
 *   f('0203001...', 2) ... 03 ... 1byte
 *   f('02818003...', 2) ... 8180 ... 2bytes
 *   f('3080....0000', 2) ... 80 ... -1
 *
 *   Requirements:
 *   - ASN.1 type octet length MUST be 1. 
 *     (i.e. ASN.1 primitives like SET, SEQUENCE, INTEGER, OCTETSTRING ...)
 */

/**
 * ASN.1 DER encoded hexadecimal string utility class
 * @name ASN1HEX
 * @class ASN.1 DER encoded hexadecimal string utility class
 * @since jsrsasign 1.1
 * @description
 * This class provides a parser for hexadecimal string of
 * DER encoded ASN.1 binary data.
 * Here are major methods of this class.
 * <ul>
 * <li><b>ACCESS BY POSITION</b>
 *   <ul>
 *   <li>{@link ASN1HEX.getTLV} - get ASN.1 TLV at specified position</li>
 *   <li>{@link ASN1HEX.getV} - get ASN.1 V at specified position</li>
 *   <li>{@link ASN1HEX.getVlen} - get integer ASN.1 L at specified position</li>
 *   <li>{@link ASN1HEX.getVidx} - get ASN.1 V position from its ASN.1 TLV position</li>
 *   <li>{@link ASN1HEX.getL} - get hexadecimal ASN.1 L at specified position</li>
 *   <li>{@link ASN1HEX.getLblen} - get byte length for ASN.1 L(length) bytes</li>
 *   </ul>
 * </li>
 * <li><b>ACCESS FOR CHILD ITEM</b>
 *   <ul>
 *   <li>{@link ASN1HEX.getNthChildIndex_AtObj} - get nth child index at specified position</li>
 *   <li>{@link ASN1HEX.getPosArrayOfChildren_AtObj} - get indexes of children</li>
 *   <li>{@link ASN1HEX.getPosOfNextSibling_AtObj} - get position of next sibling</li>
 *   </ul>
 * </li>
 * <li><b>ACCESS NESTED ASN.1 STRUCTURE</b>
 *   <ul>
 *   <li>{@link ASN1HEX.getTLVbyList} - get ASN.1 TLV at specified list index</li>
 *   <li>{@link ASN1HEX.getVbyList} - get ASN.1 V at specified nth list index with checking expected tag</li>
 *   <li>{@link ASN1HEX.getIdxbyList} - get index at specified list index</li>
 *   </ul>
 * </li>
 * <li><b>UTILITIES</b>
 *   <ul>
 *   <li>{@link ASN1HEX.dump} - dump ASN.1 structure</li>
 *   <li>{@link ASN1HEX.isASN1HEX} - check whether ASN.1 hexadecimal string or not</li>
 *   <li>{@link ASN1HEX.hextooidstr} - convert hexadecimal string of OID to dotted integer list</li>
 *   </ul>
 * </li>
 * </ul>
 */
var ASN1HEX = new function() {
};

/**
 * get byte length for ASN.1 L(length) bytes<br/>
 * @name getLblen
 * @memberOf ASN1HEX
 * @function
 * @param {String} s hexadecimal string of ASN.1 DER encoded data
 * @param {Number} idx string index
 * @return byte length for ASN.1 L(length) bytes
 * @since jsrsasign 7.2.0 asn1hex 1.1.11
 * @example
 * ASN1HEX.getLblen('020100', 0) &rarr; 1 for '01'
 * ASN1HEX.getLblen('020200', 0) &rarr; 1 for '02'
 * ASN1HEX.getLblen('02818003...', 0) &rarr; 2 for '8180'
 * ASN1HEX.getLblen('0282025b03...', 0) &rarr; 3 for '82025b'
 * ASN1HEX.getLblen('0280020100...', 0) &rarr; -1 for '80' BER indefinite length
 * ASN1HEX.getLblen('02ffab...', 0) &rarr; -2 for malformed ASN.1 length
 */
ASN1HEX.getLblen = function(s, idx) {
    if (s.substr(idx + 2, 1) != '8') return 1;
    var i = parseInt(s.substr(idx + 3, 1));
    if (i == 0) return -1;             // length octet '80' indefinite length
    if (0 < i && i < 10) return i + 1; // including '8?' octet;
    return -2;                         // malformed format
};

/**
 * get hexadecimal string for ASN.1 L(length) bytes<br/>
 * @name getL
 * @memberOf ASN1HEX
 * @function
 * @param {String} s hexadecimal string of ASN.1 DER encoded data
 * @param {Number} idx string index to get L of ASN.1 object
 * @return {String} hexadecimal string for ASN.1 L(length) bytes
 * @since jsrsasign 7.2.0 asn1hex 1.1.11
 */
ASN1HEX.getL = function(s, idx) {
    var len = ASN1HEX.getLblen(s, idx);
    if (len < 1) return '';
    return s.substr(idx + 2, len * 2);
};

/**
 * get integer value of ASN.1 length for ASN.1 data<br/>
 * @name getVblen
 * @memberOf ASN1HEX
 * @function
 * @param {String} s hexadecimal string of ASN.1 DER encoded data
 * @param {Number} idx string index
 * @return ASN.1 L(length) integer value
 * @since jsrsasign 7.2.0 asn1hex 1.1.11
 */
/*
 getting ASN.1 length value at the position 'idx' of
 hexa decimal string 's'.
 f('3082025b02...', 0) ... 82025b ... ???
 f('020100', 0) ... 01 ... 1
 f('0203001...', 0) ... 03 ... 3
 f('02818003...', 0) ... 8180 ... 128
 */
ASN1HEX.getVblen = function(s, idx) {
    var hLen, bi;
    hLen = ASN1HEX.getL(s, idx);
    if (hLen == '') return -1;
    if (hLen.substr(0, 1) === '8') {
        bi = new BigInteger(hLen.substr(2), 16);
    } else {
        bi = new BigInteger(hLen, 16);
    }
    return bi.intValue();
};

/**
 * get ASN.1 value starting string position for ASN.1 object refered by index 'idx'.
 * @name getVidx
 * @memberOf ASN1HEX
 * @function
 * @param {String} s hexadecimal string of ASN.1 DER encoded data
 * @param {Number} idx string index
 * @since jsrsasign 7.2.0 asn1hex 1.1.11
 */
ASN1HEX.getVidx = function(s, idx) {
    var l_len = ASN1HEX.getLblen(s, idx);
    if (l_len < 0) return l_len;
    return idx + (l_len + 1) * 2;
};

/**
 * get hexadecimal string of ASN.1 V(value)<br/>
 * @name getV
 * @memberOf ASN1HEX
 * @function
 * @param {String} s hexadecimal string of ASN.1 DER encoded data
 * @param {Number} idx string index
 * @return {String} hexadecimal string of ASN.1 value.
 * @since jsrsasign 7.2.0 asn1hex 1.1.11
 */
ASN1HEX.getV = function(s, idx) {
    var idx1 = ASN1HEX.getVidx(s, idx);
    var blen = ASN1HEX.getVblen(s, idx);
    return s.substr(idx1, blen * 2);
};

/**
 * get hexadecimal string of ASN.1 TLV at<br/>
 * @name getTLV
 * @memberOf ASN1HEX
 * @function
 * @param {String} s hexadecimal string of ASN.1 DER encoded data
 * @param {Number} idx string index
 * @return {String} hexadecimal string of ASN.1 TLV.
 * @since jsrsasign 7.2.0 asn1hex 1.1.11
 */
ASN1HEX.getTLV = function(s, idx) {
    return s.substr(idx, 2) + ASN1HEX.getL(s, idx) + ASN1HEX.getV(s, idx);
};

// ========== sibling methods ================================

/**
 * get next sibling starting index for ASN.1 object string<br/>
 * @name getNextSiblingIdx
 * @memberOf ASN1HEX
 * @function
 * @param {String} s hexadecimal string of ASN.1 DER encoded data
 * @param {Number} idx string index
 * @return next sibling starting index for ASN.1 object string
 * @since jsrsasign 7.2.0 asn1hex 1.1.11
 * @example
 * SEQUENCE { INTEGER 3, INTEGER 4 }
 * 3006
 *     020103 :idx=4
 *           020104 :next sibling idx=10
 * getNextSiblingIdx("3006020103020104", 4) & rarr 10
 */
ASN1HEX.getNextSiblingIdx = function(s, idx) {
    var idx1 = ASN1HEX.getVidx(s, idx);
    var blen = ASN1HEX.getVblen(s, idx);
    return idx1 + blen * 2;
};

// ========== children methods ===============================
/**
 * get array of string indexes of child ASN.1 objects<br/>
 * @name getChildIdx
 * @memberOf ASN1HEX
 * @function
 * @param {String} h hexadecimal string of ASN.1 DER encoded data
 * @param {Number} pos start string index of ASN.1 object
 * @return {Array of Number} array of indexes for childen of ASN.1 objects
 * @since jsrsasign 7.2.0 asn1hex 1.1.11
 * @description
 * This method returns array of integers for a concatination of ASN.1 objects
 * in a ASN.1 value. As for BITSTRING, one byte of unusedbits is skipped.
 * As for other ASN.1 simple types such as INTEGER, OCTET STRING or PRINTABLE STRING,
 * it returns a array of a string index of its ASN.1 value.<br/>
 * NOTE: Since asn1hex 1.1.7 of jsrsasign 6.1.2, Encapsulated BitString is supported.
 * @example
 * ASN1HEX.getChildIdx("0203012345", 0) &rArr; [4] // INTEGER 012345
 * ASN1HEX.getChildIdx("1303616161", 0) &rArr; [4] // PrintableString aaa
 * ASN1HEX.getChildIdx("030300ffff", 0) &rArr; [6] // BITSTRING ffff (unusedbits=00a)
 * ASN1HEX.getChildIdx("3006020104020105", 0) &rArr; [4, 10] // SEQUENCE(INT4,INT5)
 */
ASN1HEX.getChildIdx = function(h, pos) {
    var _ASN1HEX = ASN1HEX;
    var a = new Array();
    var p0 = _ASN1HEX.getVidx(h, pos);
    if (h.substr(pos, 2) == "03") {
	a.push(p0 + 2); // BITSTRING value without unusedbits
    } else {
	a.push(p0);
    }

    var blen = _ASN1HEX.getVblen(h, pos);
    var p = p0;
    var k = 0;
    while (1) {
        var pNext = _ASN1HEX.getNextSiblingIdx(h, p);
        if (pNext == null || (pNext - p0  >= (blen * 2))) break;
        if (k >= 200) break;
            
        a.push(pNext);
        p = pNext;
            
        k++;
    }
    
    return a;
};

/**
 * get string index of nth child object of ASN.1 object refered by h, idx<br/>
 * @name getNthChildIdx
 * @memberOf ASN1HEX
 * @function
 * @param {String} h hexadecimal string of ASN.1 DER encoded data
 * @param {Number} idx start string index of ASN.1 object
 * @param {Number} nth for child
 * @return {Number} string index of nth child.
 * @since jsrsasign 7.2.0 asn1hex 1.1.11
 */
ASN1HEX.getNthChildIdx = function(h, idx, nth) {
    var a = ASN1HEX.getChildIdx(h, idx);
    return a[nth];
};

// ========== decendant methods ==============================
/**
 * get string index of nth child object of ASN.1 object refered by h, idx<br/>
 * @name getIdxbyList
 * @memberOf ASN1HEX
 * @function
 * @param {String} h hexadecimal string of ASN.1 DER encoded data
 * @param {Number} currentIndex start string index of ASN.1 object
 * @param {Array of Number} nthList array list of nth
 * @param {String} checkingTag (OPTIONAL) string of expected ASN.1 tag for nthList 
 * @return {Number} string index refered by nthList
 * @since jsrsasign 7.1.4 asn1hex 1.1.10.
 * @description
 * @example
 * The "nthList" is a index list of structured ASN.1 object
 * reference. Here is a sample structure and "nthList"s which
 * refers each objects.
 *
 * SQUENCE               - 
 *   SEQUENCE            - [0]
 *     IA5STRING 000     - [0, 0]
 *     UTF8STRING 001    - [0, 1]
 *   SET                 - [1]
 *     IA5STRING 010     - [1, 0]
 *     UTF8STRING 011    - [1, 1]
 */
ASN1HEX.getIdxbyList = function(h, currentIndex, nthList, checkingTag) {
    var _ASN1HEX = ASN1HEX;
    var firstNth, a;
    if (nthList.length == 0) {
	if (checkingTag !== undefined) {
            if (h.substr(currentIndex, 2) !== checkingTag) {
		throw "checking tag doesn't match: " + 
                    h.substr(currentIndex, 2) + "!=" + checkingTag;
            }
	}
        return currentIndex;
    }
    firstNth = nthList.shift();
    a = _ASN1HEX.getChildIdx(h, currentIndex);
    return _ASN1HEX.getIdxbyList(h, a[firstNth], nthList, checkingTag);
};

/**
 * get ASN.1 TLV by nthList<br/>
 * @name getTLVbyList
 * @memberOf ASN1HEX
 * @function
 * @param {String} h hexadecimal string of ASN.1 structure
 * @param {Integer} currentIndex string index to start searching in hexadecimal string "h"
 * @param {Array} nthList array of nth list index
 * @param {String} checkingTag (OPTIONAL) string of expected ASN.1 tag for nthList 
 * @since jsrsasign 7.1.4 asn1hex 1.1.10
 * @description
 * This static method is to get a ASN.1 value which specified "nthList" position
 * with checking expected tag "checkingTag".
 */
ASN1HEX.getTLVbyList = function(h, currentIndex, nthList, checkingTag) {
    var _ASN1HEX = ASN1HEX;
    var idx = _ASN1HEX.getIdxbyList(h, currentIndex, nthList);
    if (idx === undefined) {
        throw "can't find nthList object";
    }
    if (checkingTag !== undefined) {
        if (h.substr(idx, 2) != checkingTag) {
            throw "checking tag doesn't match: " + 
                h.substr(idx,2) + "!=" + checkingTag;
        }
    }
    return _ASN1HEX.getTLV(h, idx);
};

/**
 * get ASN.1 value by nthList<br/>
 * @name getVbyList
 * @memberOf ASN1HEX
 * @function
 * @param {String} h hexadecimal string of ASN.1 structure
 * @param {Integer} currentIndex string index to start searching in hexadecimal string "h"
 * @param {Array} nthList array of nth list index
 * @param {String} checkingTag (OPTIONAL) string of expected ASN.1 tag for nthList 
 * @param {Boolean} removeUnusedbits (OPTIONAL) flag for remove first byte for value (DEFAULT false)
 * @since asn1hex 1.1.4
 * @description
 * This static method is to get a ASN.1 value which specified "nthList" position
 * with checking expected tag "checkingTag".
 * NOTE: 'removeUnusedbits' flag has been supported since
 * jsrsasign 7.1.14 asn1hex 1.1.10.
 */
ASN1HEX.getVbyList = function(h, currentIndex, nthList, checkingTag, removeUnusedbits) {
    var _ASN1HEX = ASN1HEX;
    var idx, v;
    idx = _ASN1HEX.getIdxbyList(h, currentIndex, nthList, checkingTag);
    
    if (idx === undefined) {
        throw "can't find nthList object";
    }

    v = _ASN1HEX.getV(h, idx);
    if (removeUnusedbits === true) v = v.substr(2);
    return v;
};

/**
 * get OID string from hexadecimal encoded value<br/>
 * @name hextooidstr
 * @memberOf ASN1HEX
 * @function
 * @param {String} hex hexadecmal string of ASN.1 DER encoded OID value
 * @return {String} OID string (ex. '1.2.3.4.567')
 * @since asn1hex 1.1.5
 */
ASN1HEX.hextooidstr = function(hex) {
    var zeroPadding = function(s, len) {
        if (s.length >= len) return s;
        return new Array(len - s.length + 1).join('0') + s;
    };

    var a = [];

    // a[0], a[1]
    var hex0 = hex.substr(0, 2);
    var i0 = parseInt(hex0, 16);
    a[0] = new String(Math.floor(i0 / 40));
    a[1] = new String(i0 % 40);

    // a[2]..a[n]
   var hex1 = hex.substr(2);
    var b = [];
    for (var i = 0; i < hex1.length / 2; i++) {
    b.push(parseInt(hex1.substr(i * 2, 2), 16));
    }
    var c = [];
    var cbin = "";
    for (var i = 0; i < b.length; i++) {
        if (b[i] & 0x80) {
            cbin = cbin + zeroPadding((b[i] & 0x7f).toString(2), 7);
        } else {
            cbin = cbin + zeroPadding((b[i] & 0x7f).toString(2), 7);
            c.push(new String(parseInt(cbin, 2)));
            cbin = "";
        }
    }

    var s = a.join(".");
    if (c.length > 0) s = s + "." + c.join(".");
    return s;
};

/**
 * get string of simple ASN.1 dump from hexadecimal ASN.1 data<br/>
 * @name dump
 * @memberOf ASN1HEX
 * @function
 * @param {Object} hexOrObj hexadecmal string of ASN.1 data or ASN1Object object
 * @param {Array} flags associative array of flags for dump (OPTION)
 * @param {Number} idx string index for starting dump (OPTION)
 * @param {String} indent indent string (OPTION)
 * @return {String} string of simple ASN.1 dump
 * @since jsrsasign 4.8.3 asn1hex 1.1.6
 * @description
 * This method will get an ASN.1 dump from
 * hexadecmal string of ASN.1 DER encoded data.
 * Here are features:
 * <ul>
 * <li>ommit long hexadecimal string</li>
 * <li>dump encapsulated OCTET STRING (good for X.509v3 extensions)</li>
 * <li>structured/primitive context specific tag support (i.e. [0], [3] ...)</li>
 * <li>automatic decode for implicit primitive context specific tag 
 * (good for X.509v3 extension value)
 *   <ul>
 *   <li>if hex starts '68747470'(i.e. http) it is decoded as utf8 encoded string.</li>
 *   <li>if it is in 'subjectAltName' extension value and is '[2]'(dNSName) tag
 *   value will be encoded as utf8 string</li>
 *   <li>otherwise it shows as hexadecimal string</li>
 *   </ul>
 * </li>
 * </ul>
 * NOTE1: Argument {@link KJUR.asn1.ASN1Object} object is supported since
 * jsrsasign 6.2.4 asn1hex 1.0.8
 * @example
 * // 1) ASN.1 INTEGER
 * ASN1HEX.dump('0203012345')
 * &darr;
 * INTEGER 012345
 *
 * // 2) ASN.1 Object Identifier
 * ASN1HEX.dump('06052b0e03021a')
 * &darr;
 * ObjectIdentifier sha1 (1 3 14 3 2 26)
 *
 * // 3) ASN.1 SEQUENCE
 * ASN1HEX.dump('3006020101020102')
 * &darr;
 * SEQUENCE
 *   INTEGER 01
 *   INTEGER 02
 *
 * // 4) ASN.1 SEQUENCE since jsrsasign 6.2.4
 * o = KJUR.asn1.ASN1Util.newObject({seq: [{int: 1}, {int: 2}]});
 * ASN1HEX.dump(o)
 * &darr;
 * SEQUENCE
 *   INTEGER 01
 *   INTEGER 02
 * // 5) ASN.1 DUMP FOR X.509 CERTIFICATE
 * ASN1HEX.dump(pemtohex(certPEM))
 * &darr;
 * SEQUENCE
 *   SEQUENCE
 *     [0]
 *       INTEGER 02
 *     INTEGER 0c009310d206dbe337553580118ddc87
 *     SEQUENCE
 *       ObjectIdentifier SHA256withRSA (1 2 840 113549 1 1 11)
 *       NULL
 *     SEQUENCE
 *       SET
 *         SEQUENCE
 *           ObjectIdentifier countryName (2 5 4 6)
 *           PrintableString 'US'
 *             :
 */
ASN1HEX.dump = function(hexOrObj, flags, idx, indent) {
    var _ASN1HEX = ASN1HEX;
    var _getV = _ASN1HEX.getV;
    var _dump = _ASN1HEX.dump;
    var _getChildIdx = _ASN1HEX.getChildIdx;

    var hex = hexOrObj;
    if (hexOrObj instanceof KJUR.asn1.ASN1Object)
	hex = hexOrObj.getEncodedHex();

    var _skipLongHex = function(hex, limitNumOctet) {
	if (hex.length <= limitNumOctet * 2) {
	    return hex;
	} else {
	    var s = hex.substr(0, limitNumOctet) + 
		    "..(total " + hex.length / 2 + "bytes).." +
		    hex.substr(hex.length - limitNumOctet, limitNumOctet);
	    return s;
	};
    };

    if (flags === undefined) flags = { "ommit_long_octet": 32 };
    if (idx === undefined) idx = 0;
    if (indent === undefined) indent = "";
    var skipLongHex = flags.ommit_long_octet;

    if (hex.substr(idx, 2) == "01") {
	var v = _getV(hex, idx);
	if (v == "00") {
	    return indent + "BOOLEAN FALSE\n";
	} else {
	    return indent + "BOOLEAN TRUE\n";
	}
    }
    if (hex.substr(idx, 2) == "02") {
	var v = _getV(hex, idx);
	return indent + "INTEGER " + _skipLongHex(v, skipLongHex) + "\n";
    }
    if (hex.substr(idx, 2) == "03") {
	var v = _getV(hex, idx);
	return indent + "BITSTRING " + _skipLongHex(v, skipLongHex) + "\n";
    }
    if (hex.substr(idx, 2) == "04") {
	var v = _getV(hex, idx);
	if (_ASN1HEX.isASN1HEX(v)) {
	    var s = indent + "OCTETSTRING, encapsulates\n";
	    s = s + _dump(v, flags, 0, indent + "  ");
	    return s;
	} else {
	    return indent + "OCTETSTRING " + _skipLongHex(v, skipLongHex) + "\n";
	}
    }
    if (hex.substr(idx, 2) == "05") {
	return indent + "NULL\n";
    }
    if (hex.substr(idx, 2) == "06") {
	var hV = _getV(hex, idx);
        var oidDot = KJUR.asn1.ASN1Util.oidHexToInt(hV);
        var oidName = KJUR.asn1.x509.OID.oid2name(oidDot);
	var oidSpc = oidDot.replace(/\./g, ' ');
        if (oidName != '') {
  	    return indent + "ObjectIdentifier " + oidName + " (" + oidSpc + ")\n";
	} else {
  	    return indent + "ObjectIdentifier (" + oidSpc + ")\n";
	}
    }
    if (hex.substr(idx, 2) == "0c") {
	return indent + "UTF8String '" + hextoutf8(_getV(hex, idx)) + "'\n";
    }
    if (hex.substr(idx, 2) == "13") {
	return indent + "PrintableString '" + hextoutf8(_getV(hex, idx)) + "'\n";
    }
    if (hex.substr(idx, 2) == "14") {
	return indent + "TeletexString '" + hextoutf8(_getV(hex, idx)) + "'\n";
    }
    if (hex.substr(idx, 2) == "16") {
	return indent + "IA5String '" + hextoutf8(_getV(hex, idx)) + "'\n";
    }
    if (hex.substr(idx, 2) == "17") {
	return indent + "UTCTime " + hextoutf8(_getV(hex, idx)) + "\n";
    }
    if (hex.substr(idx, 2) == "18") {
	return indent + "GeneralizedTime " + hextoutf8(_getV(hex, idx)) + "\n";
    }
    if (hex.substr(idx, 2) == "30") {
	if (hex.substr(idx, 4) == "3000") {
	    return indent + "SEQUENCE {}\n";
	}

	var s = indent + "SEQUENCE\n";
	var aIdx = _getChildIdx(hex, idx);

	var flagsTemp = flags;
	
	if ((aIdx.length == 2 || aIdx.length == 3) &&
	    hex.substr(aIdx[0], 2) == "06" &&
	    hex.substr(aIdx[aIdx.length - 1], 2) == "04") { // supposed X.509v3 extension
	    var oidName = _ASN1HEX.oidname(_getV(hex, aIdx[0]));
	    var flagsClone = JSON.parse(JSON.stringify(flags));
	    flagsClone.x509ExtName = oidName;
	    flagsTemp = flagsClone;
	}
	
	for (var i = 0; i < aIdx.length; i++) {
	    s = s + _dump(hex, flagsTemp, aIdx[i], indent + "  ");
	}
	return s;
    }
    if (hex.substr(idx, 2) == "31") {
	var s = indent + "SET\n";
	var aIdx = _getChildIdx(hex, idx);
	for (var i = 0; i < aIdx.length; i++) {
	    s = s + _dump(hex, flags, aIdx[i], indent + "  ");
	}
	return s;
    }
    var tag = parseInt(hex.substr(idx, 2), 16);
    if ((tag & 128) != 0) { // context specific 
	var tagNumber = tag & 31;
	if ((tag & 32) != 0) { // structured tag
	    var s = indent + "[" + tagNumber + "]\n";
	    var aIdx = _getChildIdx(hex, idx);
	    for (var i = 0; i < aIdx.length; i++) {
		s = s + _dump(hex, flags, aIdx[i], indent + "  ");
	    }
	    return s;
	} else { // primitive tag
	    var v = _getV(hex, idx);
	    if (v.substr(0, 8) == "68747470") { // http
		v = hextoutf8(v);
	    }
	    if (flags.x509ExtName === "subjectAltName" &&
		tagNumber == 2) {
		v = hextoutf8(v);
	    }
	    
	    var s = indent + "[" + tagNumber + "] " + v + "\n";
	    return s;
	}
    }
    return indent + "UNKNOWN(" + hex.substr(idx, 2) + ") " + 
	   _getV(hex, idx) + "\n";
};

/**
 * check wheather the string is ASN.1 hexadecimal string or not
 * @name isASN1HEX
 * @memberOf ASN1HEX
 * @function
 * @param {String} hex string to check whether it is hexadecmal string for ASN.1 DER or not
 * @return {Boolean} true if it is hexadecimal string of ASN.1 data otherwise false
 * @since jsrsasign 4.8.3 asn1hex 1.1.6
 * @description
 * This method checks wheather the argument 'hex' is a hexadecimal string of
 * ASN.1 data or not.
 * @example
 * ASN1HEX.isASN1HEX('0203012345') &rarr; true // PROPER ASN.1 INTEGER
 * ASN1HEX.isASN1HEX('0203012345ff') &rarr; false // TOO LONG VALUE
 * ASN1HEX.isASN1HEX('02030123') &rarr; false // TOO SHORT VALUE
 * ASN1HEX.isASN1HEX('fa3bcd') &rarr; false // WRONG FOR ASN.1
 */
ASN1HEX.isASN1HEX = function(hex) {
    var _ASN1HEX = ASN1HEX;
    if (hex.length % 2 == 1) return false;

    var intL = _ASN1HEX.getVblen(hex, 0);
    var tV = hex.substr(0, 2);
    var lV = _ASN1HEX.getL(hex, 0);
    var hVLength = hex.length - tV.length - lV.length;
    if (hVLength == intL * 2) return true;

    return false;
};

/**
 * get hexacedimal string from PEM format data<br/>
 * @name oidname
 * @memberOf ASN1HEX
 * @function
 * @param {String} oidDotOrHex number dot notation(i.e. 1.2.3) or hexadecimal string for OID
 * @return {String} name for OID
 * @since jsrsasign 7.2.0 asn1hex 1.1.11
 * @description
 * This static method gets a OID name for
 * a specified string of number dot notation (i.e. 1.2.3) or
 * hexadecimal string.
 * @example
 * ASN1HEX.oidname("2.5.29.37") &rarr; extKeyUsage
 * ASN1HEX.oidname("551d25") &rarr; extKeyUsage
 * ASN1HEX.oidname("0.1.2.3") &rarr; 0.1.2.3 // unknown
 */
ASN1HEX.oidname = function(oidDotOrHex) {
    var _KJUR_asn1 = KJUR.asn1;
    if (KJUR.lang.String.isHex(oidDotOrHex))
	oidDotOrHex = _KJUR_asn1.ASN1Util.oidHexToInt(oidDotOrHex);
    var name = _KJUR_asn1.x509.OID.oid2name(oidDotOrHex);
    if (name === "") name = oidDotOrHex;
    return name;
};

/* asn1x509-1.1.6.js (c) 2013-2018 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * asn1x509.js - ASN.1 DER encoder classes for X.509 certificate
 *
 * Copyright (c) 2013-2018 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name asn1x509-1.0.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version jsrsasign 8.0.12 asn1x509 1.1.6 (2018-Apr-22)
 * @since jsrsasign 2.1
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

/**
 * kjur's class library name space
 * // already documented in asn1-1.0.js
 * @name KJUR
 * @namespace kjur's class library name space
 */
if (typeof KJUR == "undefined" || !KJUR) KJUR = {};

/**
 * kjur's ASN.1 class library name space
 * // already documented in asn1-1.0.js
 * @name KJUR.asn1
 * @namespace
 */
if (typeof KJUR.asn1 == "undefined" || !KJUR.asn1) KJUR.asn1 = {};

/**
 * kjur's ASN.1 class for X.509 certificate library name space
 * <p>
 * <h4>FEATURES</h4>
 * <ul>
 * <li>easily issue any kind of certificate</li>
 * <li>APIs are very similar to BouncyCastle library ASN.1 classes. So easy to learn.</li>
 * </ul>
 * </p>
 * <h4>PROVIDED CLASSES</h4>
 * <ul>
 * <li>{@link KJUR.asn1.x509.Certificate}</li>
 * <li>{@link KJUR.asn1.x509.TBSCertificate}</li>
 * <li>{@link KJUR.asn1.x509.Extension}</li>
 * <li>{@link KJUR.asn1.x509.X500Name}</li>
 * <li>{@link KJUR.asn1.x509.RDN}</li>
 * <li>{@link KJUR.asn1.x509.AttributeTypeAndValue}</li>
 * <li>{@link KJUR.asn1.x509.SubjectPublicKeyInfo}</li>
 * <li>{@link KJUR.asn1.x509.AlgorithmIdentifier}</li>
 * <li>{@link KJUR.asn1.x509.GeneralName}</li>
 * <li>{@link KJUR.asn1.x509.GeneralNames}</li>
 * <li>{@link KJUR.asn1.x509.DistributionPointName}</li>
 * <li>{@link KJUR.asn1.x509.DistributionPoint}</li>
 * <li>{@link KJUR.asn1.x509.CRL}</li>
 * <li>{@link KJUR.asn1.x509.TBSCertList}</li>
 * <li>{@link KJUR.asn1.x509.CRLEntry}</li>
 * <li>{@link KJUR.asn1.x509.OID}</li>
 * </ul>
 * <h4>SUPPORTED EXTENSIONS</h4>
 * <ul>
 * <li>{@link KJUR.asn1.x509.BasicConstraints}</li>
 * <li>{@link KJUR.asn1.x509.KeyUsage}</li>
 * <li>{@link KJUR.asn1.x509.CRLDistributionPoints}</li>
 * <li>{@link KJUR.asn1.x509.ExtKeyUsage}</li>
 * <li>{@link KJUR.asn1.x509.AuthorityKeyIdentifier}</li>
 * <li>{@link KJUR.asn1.x509.AuthorityInfoAccess}</li>
 * <li>{@link KJUR.asn1.x509.SubjectAltName}</li>
 * <li>{@link KJUR.asn1.x509.IssuerAltName}</li>
 * </ul>
 * NOTE1: Please ignore method summary and document of this namespace. This caused by a bug of jsdoc2.<br/>
 * NOTE2: SubjectAltName and IssuerAltName extension were supported since 
 * jsrsasign 6.2.3 asn1x509 1.0.19.<br/>
 * @name KJUR.asn1.x509
 * @namespace
 */
if (typeof KJUR.asn1.x509 == "undefined" || !KJUR.asn1.x509) KJUR.asn1.x509 = {};

// === BEGIN Certificate ===================================================

/**
 * X.509 Certificate class to sign and generate hex encoded certificate
 * @name KJUR.asn1.x509.Certificate
 * @class X.509 Certificate class to sign and generate hex encoded certificate
 * @param {Array} params associative array of parameters (ex. {'tbscertobj': obj, 'prvkeyobj': key})
 * @extends KJUR.asn1.ASN1Object
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>tbscertobj - specify {@link KJUR.asn1.x509.TBSCertificate} object</li>
 * <li>prvkeyobj - specify {@link RSAKey}, {@link KJUR.crypto.ECDSA} or {@link KJUR.crypto.DSA} object for CA private key to sign the certificate</li>
 * </ul>
 * NOTE1: 'params' can be omitted.<br/>
 * NOTE2: DSA/ECDSA is also supported for CA signging key from asn1x509 1.0.6.
 * @example
 * var caKey = KEYUTIL.getKey(caKeyPEM); // CA's private key
 * var cert = new KJUR.asn1x509.Certificate({'tbscertobj': tbs, 'prvkeyobj': caKey});
 * cert.sign(); // issue certificate by CA's private key
 * var certPEM = cert.getPEMString();
 *
 * // Certificate  ::=  SEQUENCE  {
 * //     tbsCertificate       TBSCertificate,
 * //     signatureAlgorithm   AlgorithmIdentifier,
 * //     signature            BIT STRING  }
 */
KJUR.asn1.x509.Certificate = function(params) {
    KJUR.asn1.x509.Certificate.superclass.constructor.call(this);
    var asn1TBSCert = null,
	asn1SignatureAlg = null,
	asn1Sig = null,
	hexSig = null,
        prvKey = null,
	_KJUR = KJUR,
	_KJUR_crypto = _KJUR.crypto,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_DERBitString = _KJUR_asn1.DERBitString;

    /**
     * sign TBSCertificate and set signature value internally
     * @name sign
     * @memberOf KJUR.asn1.x509.Certificate#
     * @function
     * @description
     * @example
     * var cert = new KJUR.asn1.x509.Certificate({tbscertobj: tbs, prvkeyobj: prvKey});
     * cert.sign();
     */
    this.sign = function() {
        this.asn1SignatureAlg = this.asn1TBSCert.asn1SignatureAlg;
	
        var sig = new KJUR.crypto.Signature({alg: this.asn1SignatureAlg.nameAlg});
        sig.init(this.prvKey);
        sig.updateHex(this.asn1TBSCert.getEncodedHex());
        this.hexSig = sig.sign();

        this.asn1Sig = new _DERBitString({'hex': '00' + this.hexSig});

        var seq = new _DERSequence({'array': [this.asn1TBSCert,
                                              this.asn1SignatureAlg,
                                              this.asn1Sig]});
        this.hTLV = seq.getEncodedHex();
        this.isModified = false;
    };

    /**
     * set signature value internally by hex string
     * @name setSignatureHex
     * @memberOf KJUR.asn1.x509.Certificate#
     * @function
     * @since asn1x509 1.0.8
     * @description
     * @example
     * var cert = new KJUR.asn1.x509.Certificate({'tbscertobj': tbs});
     * cert.setSignatureHex('01020304');
     */
    this.setSignatureHex = function(sigHex) {
        this.asn1SignatureAlg = this.asn1TBSCert.asn1SignatureAlg;
        this.hexSig = sigHex;
        this.asn1Sig = new _DERBitString({'hex': '00' + this.hexSig});

        var seq = new _DERSequence({'array': [this.asn1TBSCert,
                                              this.asn1SignatureAlg,
                                              this.asn1Sig]});
        this.hTLV = seq.getEncodedHex();
        this.isModified = false;
    };

    this.getEncodedHex = function() {
        if (this.isModified == false && this.hTLV != null) return this.hTLV;
        throw "not signed yet";
    };

    /**
     * get PEM formatted certificate string after signed
     * @name getPEMString
     * @memberOf KJUR.asn1.x509.Certificate#
     * @function
     * @return PEM formatted string of certificate
     * @description
     * @example
     * var cert = new KJUR.asn1.x509.Certificate({'tbscertobj': tbs, 'prvkeyobj': prvKey});
     * cert.sign();
     * var sPEM = cert.getPEMString();
     */
    this.getPEMString = function() {
	var pemBody = hextob64nl(this.getEncodedHex());
        return "-----BEGIN CERTIFICATE-----\r\n" + 
	    pemBody + 
	    "\r\n-----END CERTIFICATE-----\r\n";
    };

    if (params !== undefined) {
        if (params.tbscertobj !== undefined) {
            this.asn1TBSCert = params.tbscertobj;
        }
        if (params.prvkeyobj !== undefined) {
            this.prvKey = params.prvkeyobj;
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.Certificate, KJUR.asn1.ASN1Object);

/**
 * ASN.1 TBSCertificate structure class
 * @name KJUR.asn1.x509.TBSCertificate
 * @class ASN.1 TBSCertificate structure class
 * @param {Array} params associative array of parameters (ex. {})
 * @extends KJUR.asn1.ASN1Object
 * @description
 * <br/>
 * <h4>EXAMPLE</h4>
 * @example
 *  var o = new KJUR.asn1.x509.TBSCertificate();
 *  o.setSerialNumberByParam({'int': 4});
 *  o.setSignatureAlgByParam({'name': 'SHA1withRSA'});
 *  o.setIssuerByParam({'str': '/C=US/O=a'});
 *  o.setNotBeforeByParam({'str': '130504235959Z'});
 *  o.setNotAfterByParam({'str': '140504235959Z'});
 *  o.setSubjectByParam({'str': '/C=US/CN=b'});
 *  o.setSubjectPublicKey(rsaPubKey);
 *  o.appendExtension(new KJUR.asn1.x509.BasicConstraints({'cA':true}));
 *  o.appendExtension(new KJUR.asn1.x509.KeyUsage({'bin':'11'}));
 */
KJUR.asn1.x509.TBSCertificate = function(params) {
    KJUR.asn1.x509.TBSCertificate.superclass.constructor.call(this);

    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_DERInteger = _KJUR_asn1.DERInteger,
	_DERTaggedObject = _KJUR_asn1.DERTaggedObject,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_Time = _KJUR_asn1_x509.Time,
	_X500Name = _KJUR_asn1_x509.X500Name,
	_SubjectPublicKeyInfo = _KJUR_asn1_x509.SubjectPublicKeyInfo;

    this._initialize = function() {
        this.asn1Array = new Array();

        this.asn1Version =
            new _DERTaggedObject({'obj': new _DERInteger({'int': 2})});
        this.asn1SerialNumber = null;
        this.asn1SignatureAlg = null;
        this.asn1Issuer = null;
        this.asn1NotBefore = null;
        this.asn1NotAfter = null;
        this.asn1Subject = null;
        this.asn1SubjPKey = null;
        this.extensionsArray = new Array();
    };

    /**
     * set serial number field by parameter
     * @name setSerialNumberByParam
     * @memberOf KJUR.asn1.x509.TBSCertificate#
     * @function
     * @param {Array} intParam DERInteger param
     * @description
     * @example
     * tbsc.setSerialNumberByParam({'int': 3});
     */
    this.setSerialNumberByParam = function(intParam) {
        this.asn1SerialNumber = new _DERInteger(intParam);
    };

    /**
     * set signature algorithm field by parameter
     * @name setSignatureAlgByParam
     * @memberOf KJUR.asn1.x509.TBSCertificate#
     * @function
     * @param {Array} algIdParam AlgorithmIdentifier parameter
     * @description
     * @example
     * tbsc.setSignatureAlgByParam({'name': 'SHA1withRSA'});
     */
    this.setSignatureAlgByParam = function(algIdParam) {
        this.asn1SignatureAlg = new _KJUR_asn1_x509.AlgorithmIdentifier(algIdParam);
    };

    /**
     * set issuer name field by parameter
     * @name setIssuerByParam
     * @memberOf KJUR.asn1.x509.TBSCertificate#
     * @function
     * @param {Array} x500NameParam X500Name parameter
     * @description
     * @example
     * tbsc.setIssuerParam({'str': '/C=US/CN=b'});
     * @see KJUR.asn1.x509.X500Name
     */
    this.setIssuerByParam = function(x500NameParam) {
        this.asn1Issuer = new _X500Name(x500NameParam);
    };

    /**
     * set notBefore field by parameter
     * @name setNotBeforeByParam
     * @memberOf KJUR.asn1.x509.TBSCertificate#
     * @function
     * @param {Array} timeParam Time parameter
     * @description
     * @example
     * tbsc.setNotBeforeByParam({'str': '130508235959Z'});
     * @see KJUR.asn1.x509.Time
     */
    this.setNotBeforeByParam = function(timeParam) {
        this.asn1NotBefore = new _Time(timeParam);
    };

    /**
     * set notAfter field by parameter
     * @name setNotAfterByParam
     * @memberOf KJUR.asn1.x509.TBSCertificate#
     * @function
     * @param {Array} timeParam Time parameter
     * @description
     * @example
     * tbsc.setNotAfterByParam({'str': '130508235959Z'});
     * @see KJUR.asn1.x509.Time
     */
    this.setNotAfterByParam = function(timeParam) {
        this.asn1NotAfter = new _Time(timeParam);
    };

    /**
     * set subject name field by parameter
     * @name setSubjectByParam
     * @memberOf KJUR.asn1.x509.TBSCertificate#
     * @function
     * @param {Array} x500NameParam X500Name parameter
     * @description
     * @example
     * tbsc.setSubjectParam({'str': '/C=US/CN=b'});
     * @see KJUR.asn1.x509.X500Name
     */
    this.setSubjectByParam = function(x500NameParam) {
        this.asn1Subject = new _X500Name(x500NameParam);
    };

    /**
     * set subject public key info field by key object
     * @name setSubjectPublicKey
     * @memberOf KJUR.asn1.x509.TBSCertificate#
     * @function
     * @param {Array} param {@link KJUR.asn1.x509.SubjectPublicKeyInfo} class constructor parameter
     * @description
     * @example
     * tbsc.setSubjectPublicKey(keyobj);
     * @see KJUR.asn1.x509.SubjectPublicKeyInfo
     */
    this.setSubjectPublicKey = function(param) {
        this.asn1SubjPKey = new _SubjectPublicKeyInfo(param);
    };

    /**
     * set subject public key info by RSA/ECDSA/DSA key parameter
     * @name setSubjectPublicKeyByGetKey
     * @memberOf KJUR.asn1.x509.TBSCertificate
     * @function
     * @param {Object} keyParam public key parameter which passed to {@link KEYUTIL.getKey} argument
     * @description
     * @example
     * tbsc.setSubjectPublicKeyByGetKeyParam(certPEMString); // or
     * tbsc.setSubjectPublicKeyByGetKeyParam(pkcs8PublicKeyPEMString); // or
     * tbsc.setSubjectPublicKeyByGetKeyParam(kjurCryptoECDSAKeyObject); // et.al.
     * @see KJUR.asn1.x509.SubjectPublicKeyInfo
     * @see KEYUTIL.getKey
     * @since asn1x509 1.0.6
     */
    this.setSubjectPublicKeyByGetKey = function(keyParam) {
        var keyObj = KEYUTIL.getKey(keyParam);
        this.asn1SubjPKey = new _SubjectPublicKeyInfo(keyObj);
    };

    /**
     * append X.509v3 extension to this object
     * @name appendExtension
     * @memberOf KJUR.asn1.x509.TBSCertificate#
     * @function
     * @param {Extension} extObj X.509v3 Extension object
     * @description
     * @example
     * tbsc.appendExtension(new KJUR.asn1.x509.BasicConstraints({'cA':true, 'critical': true}));
     * tbsc.appendExtension(new KJUR.asn1.x509.KeyUsage({'bin':'11'}));
     * @see KJUR.asn1.x509.Extension
     */
    this.appendExtension = function(extObj) {
        this.extensionsArray.push(extObj);
    };

    /**
     * append X.509v3 extension to this object by name and parameters
     * @name appendExtensionByName
     * @memberOf KJUR.asn1.x509.TBSCertificate#
     * @function
     * @param {name} name name of X.509v3 Extension object
     * @param {Array} extParams parameters as argument of Extension constructor.
     * @description
     * This method adds a X.509v3 extension specified by name 
     * and extParams to internal extension array of X.509v3 extension objects.
     * Here is supported names of extension:
     * <ul>
     * <li>BasicConstraints - {@link KJUR.asn1.x509.BasicConstraints}</li>
     * <li>KeyUsage - {@link KJUR.asn1.x509.KeyUsage}</li>
     * <li>CRLDistributionPoints - {@link KJUR.asn1.x509.CRLDistributionPoints}</li>
     * <li>ExtKeyUsage - {@link KJUR.asn1.x509.ExtKeyUsage}</li>
     * <li>AuthorityKeyIdentifier - {@link KJUR.asn1.x509.AuthorityKeyIdentifier}</li>
     * <li>AuthorityInfoAccess - {@link KJUR.asn1.x509.AuthorityInfoAccess}</li>
     * <li>SubjectAltName - {@link KJUR.asn1.x509.SubjectAltName}</li>
     * <li>IssuerAltName - {@link KJUR.asn1.x509.IssuerAltName}</li>
     * </ul>
     * @example
     * var o = new KJUR.asn1.x509.TBSCertificate();
     * o.appendExtensionByName('BasicConstraints', {'cA':true, 'critical': true});
     * o.appendExtensionByName('KeyUsage', {'bin':'11'});
     * o.appendExtensionByName('CRLDistributionPoints', {uri: 'http://aaa.com/a.crl'});
     * o.appendExtensionByName('ExtKeyUsage', {array: [{name: 'clientAuth'}]});
     * o.appendExtensionByName('AuthorityKeyIdentifier', {kid: '1234ab..'});
     * o.appendExtensionByName('AuthorityInfoAccess', {array: [{accessMethod:{oid:...},accessLocation:{uri:...}}]});
     * @see KJUR.asn1.x509.Extension
     */
    this.appendExtensionByName = function(name, extParams) {
	KJUR.asn1.x509.Extension.appendByNameToArray(name,
						     extParams,
						     this.extensionsArray);
    };

    this.getEncodedHex = function() {
        if (this.asn1NotBefore == null || this.asn1NotAfter == null)
            throw "notBefore and/or notAfter not set";
        var asn1Validity =
            new _DERSequence({'array':[this.asn1NotBefore, this.asn1NotAfter]});

        this.asn1Array = new Array();

        this.asn1Array.push(this.asn1Version);
        this.asn1Array.push(this.asn1SerialNumber);
        this.asn1Array.push(this.asn1SignatureAlg);
        this.asn1Array.push(this.asn1Issuer);
        this.asn1Array.push(asn1Validity);
        this.asn1Array.push(this.asn1Subject);
        this.asn1Array.push(this.asn1SubjPKey);

        if (this.extensionsArray.length > 0) {
            var extSeq = new _DERSequence({"array": this.extensionsArray});
            var extTagObj = new _DERTaggedObject({'explicit': true,
                                                  'tag': 'a3',
                                                  'obj': extSeq});
            this.asn1Array.push(extTagObj);
        }

        var o = new _DERSequence({"array": this.asn1Array});
        this.hTLV = o.getEncodedHex();
        this.isModified = false;
        return this.hTLV;
    };

    this._initialize();
};
YAHOO.lang.extend(KJUR.asn1.x509.TBSCertificate, KJUR.asn1.ASN1Object);

// === END   TBSCertificate ===================================================

// === BEGIN X.509v3 Extensions Related =======================================

/**
 * base Extension ASN.1 structure class
 * @name KJUR.asn1.x509.Extension
 * @class base Extension ASN.1 structure class
 * @param {Array} params associative array of parameters (ex. {'critical': true})
 * @extends KJUR.asn1.ASN1Object
 * @description
 * @example
 * // Extension  ::=  SEQUENCE  {
 * //     extnID      OBJECT IDENTIFIER,
 * //     critical    BOOLEAN DEFAULT FALSE,
 * //     extnValue   OCTET STRING  }
 */
KJUR.asn1.x509.Extension = function(params) {
    KJUR.asn1.x509.Extension.superclass.constructor.call(this);
    var asn1ExtnValue = null,
	_KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERObjectIdentifier = _KJUR_asn1.DERObjectIdentifier,
	_DEROctetString = _KJUR_asn1.DEROctetString,
	_DERBitString = _KJUR_asn1.DERBitString,
	_DERBoolean = _KJUR_asn1.DERBoolean,
	_DERSequence = _KJUR_asn1.DERSequence;

    this.getEncodedHex = function() {
        var asn1Oid = new _DERObjectIdentifier({'oid': this.oid});
        var asn1EncapExtnValue =
            new _DEROctetString({'hex': this.getExtnValueHex()});

        var asn1Array = new Array();
        asn1Array.push(asn1Oid);
        if (this.critical) asn1Array.push(new _DERBoolean());
        asn1Array.push(asn1EncapExtnValue);

        var asn1Seq = new _DERSequence({'array': asn1Array});
        return asn1Seq.getEncodedHex();
    };

    this.critical = false;
    if (params !== undefined) {
        if (params.critical !== undefined) {
            this.critical = params.critical;
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.Extension, KJUR.asn1.ASN1Object);

/**
 * append X.509v3 extension to any specified array<br/>
 * @name appendByNameToArray
 * @memberOf KJUR.asn1.x509.Extension
 * @function
 * @param {String} name X.509v3 extension name
 * @param {Object} extParams associative array of extension parameters
 * @param {Array} a array to add specified extension
 * @see KJUR.asn1.x509.Extension
 * @since jsrsasign 6.2.3 asn1x509 1.0.19
 * @description
 * This static function add a X.509v3 extension specified by name and extParams to
 * array 'a' so that 'a' will be an array of X.509v3 extension objects.
 * See {@link KJUR.asn1.x509.TBSCertificate#appendExtensionByName}
 * for supported names of extensions.
 * @example
 * var a = new Array();
 * KJUR.asn1.x509.Extension.appendByNameToArray("BasicConstraints", {'cA':true, 'critical': true}, a);
 * KJUR.asn1.x509.Extension.appendByNameToArray("KeyUsage", {'bin':'11'}, a);
 */
KJUR.asn1.x509.Extension.appendByNameToArray = function(name, extParams, a) {
    var _lowname = name.toLowerCase(),
	_KJUR_asn1_x509 = KJUR.asn1.x509;
    
    if (_lowname == "basicconstraints") {
        var extObj = new _KJUR_asn1_x509.BasicConstraints(extParams);
        a.push(extObj);
    } else if (_lowname == "keyusage") {
        var extObj = new _KJUR_asn1_x509.KeyUsage(extParams);
        a.push(extObj);
    } else if (_lowname == "crldistributionpoints") {
        var extObj = new _KJUR_asn1_x509.CRLDistributionPoints(extParams);
        a.push(extObj);
    } else if (_lowname == "extkeyusage") {
        var extObj = new _KJUR_asn1_x509.ExtKeyUsage(extParams);
        a.push(extObj);
    } else if (_lowname == "authoritykeyidentifier") {
        var extObj = new _KJUR_asn1_x509.AuthorityKeyIdentifier(extParams);
        a.push(extObj);
    } else if (_lowname == "authorityinfoaccess") {
        var extObj = new _KJUR_asn1_x509.AuthorityInfoAccess(extParams);
        a.push(extObj);
    } else if (_lowname == "subjectaltname") {
        var extObj = new _KJUR_asn1_x509.SubjectAltName(extParams);
        a.push(extObj);
    } else if (_lowname == "issueraltname") {
        var extObj = new _KJUR_asn1_x509.IssuerAltName(extParams);
        a.push(extObj);
    } else {
        throw "unsupported extension name: " + name;
    }
};

/**
 * KeyUsage ASN.1 structure class
 * @name KJUR.asn1.x509.KeyUsage
 * @class KeyUsage ASN.1 structure class
 * @param {Array} params associative array of parameters (ex. {'bin': '11', 'critical': true})
 * @extends KJUR.asn1.x509.Extension
 * @description
 * This class is for <a href="https://tools.ietf.org/html/rfc5280#section-4.2.1.3" target="_blank">KeyUsage</a> X.509v3 extension.
 * <pre>
 * id-ce-keyUsage OBJECT IDENTIFIER ::=  { id-ce 15 }
 * KeyUsage ::= BIT STRING {
 *   digitalSignature   (0),
 *   nonRepudiation     (1),
 *   keyEncipherment    (2),
 *   dataEncipherment   (3),
 *   keyAgreement       (4),
 *   keyCertSign        (5),
 *   cRLSign            (6),
 *   encipherOnly       (7),
 *   decipherOnly       (8) }
 * </pre><br/>
 * NOTE: 'names' parameter is supprted since jsrsasign 8.0.14.
 * @example
 * o = new KJUR.asn1.x509.KeyUsage({bin: "11"});
 * o = new KJUR.asn1.x509.KeyUsage({critical: true, bin: "11"});
 * o = new KJUR.asn1.x509.KeyUsage({names: ['digitalSignature', 'keyAgreement']});
 */
KJUR.asn1.x509.KeyUsage = function(params) {
    KJUR.asn1.x509.KeyUsage.superclass.constructor.call(this, params);
    var _KEYUSAGE_NAME = X509.KEYUSAGE_NAME;

    this.getExtnValueHex = function() {
        return this.asn1ExtnValue.getEncodedHex();
    };

    this.oid = "2.5.29.15";
    if (params !== undefined) {
        if (params.bin !== undefined) {
            this.asn1ExtnValue = new KJUR.asn1.DERBitString(params);
        }
	if (params.names !== undefined &&
	    params.names.length !== undefined) {
	    var names = params.names;
	    var s = "000000000";
	    for (var i = 0; i < names.length; i++) {
		for (var j = 0; j < _KEYUSAGE_NAME.length; j++) {
		    if (names[i] === _KEYUSAGE_NAME[j]) {
			s = s.substring(0, j) + '1' + 
			    s.substring(j + 1, s.length);
		    }
		}
	    }
            this.asn1ExtnValue = new KJUR.asn1.DERBitString({bin: s});
	}
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.KeyUsage, KJUR.asn1.x509.Extension);

/**
 * BasicConstraints ASN.1 structure class
 * @name KJUR.asn1.x509.BasicConstraints
 * @class BasicConstraints ASN.1 structure class
 * @param {Array} params associative array of parameters (ex. {'cA': true, 'critical': true})
 * @extends KJUR.asn1.x509.Extension
 * @description
 * @example
 */
KJUR.asn1.x509.BasicConstraints = function(params) {
    KJUR.asn1.x509.BasicConstraints.superclass.constructor.call(this, params);
    var cA = false;
    var pathLen = -1;

    this.getExtnValueHex = function() {
        var asn1Array = new Array();
        if (this.cA) asn1Array.push(new KJUR.asn1.DERBoolean());
        if (this.pathLen > -1)
            asn1Array.push(new KJUR.asn1.DERInteger({'int': this.pathLen}));
        var asn1Seq = new KJUR.asn1.DERSequence({'array': asn1Array});
        this.asn1ExtnValue = asn1Seq;
        return this.asn1ExtnValue.getEncodedHex();
    };

    this.oid = "2.5.29.19";
    this.cA = false;
    this.pathLen = -1;
    if (params !== undefined) {
        if (params.cA !== undefined) {
            this.cA = params.cA;
        }
        if (params.pathLen !== undefined) {
            this.pathLen = params.pathLen;
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.BasicConstraints, KJUR.asn1.x509.Extension);

/**
 * CRLDistributionPoints ASN.1 structure class
 * @name KJUR.asn1.x509.CRLDistributionPoints
 * @class CRLDistributionPoints ASN.1 structure class
 * @param {Array} params associative array of parameters (ex. {'uri': 'http://a.com/', 'critical': true})
 * @extends KJUR.asn1.x509.Extension
 * @description
 * <pre>
 * id-ce-cRLDistributionPoints OBJECT IDENTIFIER ::=  { id-ce 31 }
 *
 * CRLDistributionPoints ::= SEQUENCE SIZE (1..MAX) OF DistributionPoint
 *
 * DistributionPoint ::= SEQUENCE {
 *      distributionPoint       [0]     DistributionPointName OPTIONAL,
 *      reasons                 [1]     ReasonFlags OPTIONAL,
 *      cRLIssuer               [2]     GeneralNames OPTIONAL }
 *
 * DistributionPointName ::= CHOICE {
 *      fullName                [0]     GeneralNames,
 *      nameRelativeToCRLIssuer [1]     RelativeDistinguishedName }
 * 
 * ReasonFlags ::= BIT STRING {
 *      unused                  (0),
 *      keyCompromise           (1),
 *      cACompromise            (2),
 *      affiliationChanged      (3),
 *      superseded              (4),
 *      cessationOfOperation    (5),
 *      certificateHold         (6),
 *      privilegeWithdrawn      (7),
 *      aACompromise            (8) }
 * </pre>
 * @example
 */
KJUR.asn1.x509.CRLDistributionPoints = function(params) {
    KJUR.asn1.x509.CRLDistributionPoints.superclass.constructor.call(this, params);
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_KJUR_asn1_x509 = _KJUR_asn1.x509;

    this.getExtnValueHex = function() {
        return this.asn1ExtnValue.getEncodedHex();
    };

    this.setByDPArray = function(dpArray) {
        this.asn1ExtnValue = new _KJUR_asn1.DERSequence({'array': dpArray});
    };

    this.setByOneURI = function(uri) {
        var gn1 = new _KJUR_asn1_x509.GeneralNames([{'uri': uri}]);
        var dpn1 = new _KJUR_asn1_x509.DistributionPointName(gn1);
        var dp1 = new _KJUR_asn1_x509.DistributionPoint({'dpobj': dpn1});
        this.setByDPArray([dp1]);
    };

    this.oid = "2.5.29.31";
    if (params !== undefined) {
        if (params.array !== undefined) {
            this.setByDPArray(params.array);
        } else if (params.uri !== undefined) {
            this.setByOneURI(params.uri);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.CRLDistributionPoints, KJUR.asn1.x509.Extension);

/**
 * KeyUsage ASN.1 structure class
 * @name KJUR.asn1.x509.ExtKeyUsage
 * @class ExtKeyUsage ASN.1 structure class
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.x509.Extension
 * @description
 * @example
 * e1 = new KJUR.asn1.x509.ExtKeyUsage({
 *   critical: true,
 *   array: [
 *     {oid: '2.5.29.37.0'},  // anyExtendedKeyUsage
 *     {name: 'clientAuth'}
 *   ]
 * });
 * // id-ce-extKeyUsage OBJECT IDENTIFIER ::= { id-ce 37 }
 * // ExtKeyUsageSyntax ::= SEQUENCE SIZE (1..MAX) OF KeyPurposeId
 * // KeyPurposeId ::= OBJECT IDENTIFIER
 */
KJUR.asn1.x509.ExtKeyUsage = function(params) {
    KJUR.asn1.x509.ExtKeyUsage.superclass.constructor.call(this, params);
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1;

    this.setPurposeArray = function(purposeArray) {
        this.asn1ExtnValue = new _KJUR_asn1.DERSequence();
        for (var i = 0; i < purposeArray.length; i++) {
            var o = new _KJUR_asn1.DERObjectIdentifier(purposeArray[i]);
            this.asn1ExtnValue.appendASN1Object(o);
        }
    };

    this.getExtnValueHex = function() {
        return this.asn1ExtnValue.getEncodedHex();
    };

    this.oid = "2.5.29.37";
    if (params !== undefined) {
        if (params.array !== undefined) {
            this.setPurposeArray(params.array);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.ExtKeyUsage, KJUR.asn1.x509.Extension);

/**
 * AuthorityKeyIdentifier ASN.1 structure class
 * @name KJUR.asn1.x509.AuthorityKeyIdentifier
 * @class AuthorityKeyIdentifier ASN.1 structure class
 * @param {Array} params associative array of parameters (ex. {'uri': 'http://a.com/', 'critical': true})
 * @extends KJUR.asn1.x509.Extension
 * @since asn1x509 1.0.8
 * @description
 * <pre>
 * d-ce-authorityKeyIdentifier OBJECT IDENTIFIER ::=  { id-ce 35 }
 * AuthorityKeyIdentifier ::= SEQUENCE {
 *    keyIdentifier             [0] KeyIdentifier           OPTIONAL,
 *    authorityCertIssuer       [1] GeneralNames            OPTIONAL,
 *    authorityCertSerialNumber [2] CertificateSerialNumber OPTIONAL  }
 * KeyIdentifier ::= OCTET STRING
 * </pre>
 * @example
 * e1 = new KJUR.asn1.x509.AuthorityKeyIdentifier({
 *   critical: true,
 *   kid:    {hex: '89ab'},
 *   issuer: {str: '/C=US/CN=a'},
 *   sn:     {hex: '1234'}
 * });
 */
KJUR.asn1.x509.AuthorityKeyIdentifier = function(params) {
    KJUR.asn1.x509.AuthorityKeyIdentifier.superclass.constructor.call(this, params);
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERTaggedObject = _KJUR_asn1.DERTaggedObject;

    this.asn1KID = null;
    this.asn1CertIssuer = null;
    this.asn1CertSN = null;

    this.getExtnValueHex = function() {
        var a = new Array();
        if (this.asn1KID)
            a.push(new _DERTaggedObject({'explicit': false,
                                         'tag': '80',
                                         'obj': this.asn1KID}));
        if (this.asn1CertIssuer)
            a.push(new _DERTaggedObject({'explicit': false,
                                         'tag': 'a1',
                                         'obj': this.asn1CertIssuer}));
        if (this.asn1CertSN)
            a.push(new _DERTaggedObject({'explicit': false,
                                         'tag': '82',
                                         'obj': this.asn1CertSN}));

        var asn1Seq = new _KJUR_asn1.DERSequence({'array': a});
        this.asn1ExtnValue = asn1Seq;
        return this.asn1ExtnValue.getEncodedHex();
    };

    /**
     * set keyIdentifier value by DERInteger parameter
     * @name setKIDByParam
     * @memberOf KJUR.asn1.x509.AuthorityKeyIdentifier#
     * @function
     * @param {Array} param array of {@link KJUR.asn1.DERInteger} parameter
     * @since asn1x509 1.0.8
     * @description
     * NOTE: Automatic keyIdentifier value calculation by an issuer
     * public key will be supported in future version.
     */
    this.setKIDByParam = function(param) {
        this.asn1KID = new KJUR.asn1.DEROctetString(param);
    };

    /**
     * set authorityCertIssuer value by X500Name parameter
     * @name setCertIssuerByParam
     * @memberOf KJUR.asn1.x509.AuthorityKeyIdentifier#
     * @function
     * @param {Array} param array of {@link KJUR.asn1.x509.X500Name} parameter
     * @since asn1x509 1.0.8
     * @description
     * NOTE: Automatic authorityCertIssuer name setting by an issuer
     * certificate will be supported in future version.
     */
    this.setCertIssuerByParam = function(param) {
        this.asn1CertIssuer = new KJUR.asn1.x509.X500Name(param);
    };

    /**
     * set authorityCertSerialNumber value by DERInteger parameter
     * @name setCertSerialNumberByParam
     * @memberOf KJUR.asn1.x509.AuthorityKeyIdentifier#
     * @function
     * @param {Array} param array of {@link KJUR.asn1.DERInteger} parameter
     * @since asn1x509 1.0.8
     * @description
     * NOTE: Automatic authorityCertSerialNumber setting by an issuer
     * certificate will be supported in future version.
     */
    this.setCertSNByParam = function(param) {
        this.asn1CertSN = new KJUR.asn1.DERInteger(param);
    };

    this.oid = "2.5.29.35";
    if (params !== undefined) {
        if (params.kid !== undefined) {
            this.setKIDByParam(params.kid);
        }
        if (params.issuer !== undefined) {
            this.setCertIssuerByParam(params.issuer);
        }
        if (params.sn !== undefined) {
            this.setCertSNByParam(params.sn);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.AuthorityKeyIdentifier, KJUR.asn1.x509.Extension);

/**
 * AuthorityInfoAccess ASN.1 structure class
 * @name KJUR.asn1.x509.AuthorityInfoAccess
 * @class AuthorityInfoAccess ASN.1 structure class
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.x509.Extension
 * @since asn1x509 1.0.8
 * @description
 * <pre>
 * id-pe OBJECT IDENTIFIER  ::=  { id-pkix 1 }
 * id-pe-authorityInfoAccess OBJECT IDENTIFIER ::= { id-pe 1 }
 * AuthorityInfoAccessSyntax  ::=
 *         SEQUENCE SIZE (1..MAX) OF AccessDescription
 * AccessDescription  ::=  SEQUENCE {
 *         accessMethod          OBJECT IDENTIFIER,
 *         accessLocation        GeneralName  }
 * id-ad OBJECT IDENTIFIER ::= { id-pkix 48 }
 * id-ad-caIssuers OBJECT IDENTIFIER ::= { id-ad 2 }
 * id-ad-ocsp OBJECT IDENTIFIER ::= { id-ad 1 }
 * </pre>
 * @example
 * e1 = new KJUR.asn1.x509.AuthorityInfoAccess({
 *   array: [{
 *     accessMethod:{'oid': '1.3.6.1.5.5.7.48.1'},
 *     accessLocation:{'uri': 'http://ocsp.cacert.org'}
 *   }]
 * });
 */
KJUR.asn1.x509.AuthorityInfoAccess = function(params) {
    KJUR.asn1.x509.AuthorityInfoAccess.superclass.constructor.call(this, params);

    this.setAccessDescriptionArray = function(accessDescriptionArray) {
        var array = new Array(),
	    _KJUR = KJUR,
	    _KJUR_asn1 = _KJUR.asn1,
	    _DERSequence = _KJUR_asn1.DERSequence;

        for (var i = 0; i < accessDescriptionArray.length; i++) {
            var o = new _KJUR_asn1.DERObjectIdentifier(accessDescriptionArray[i].accessMethod);
            var gn = new _KJUR_asn1.x509.GeneralName(accessDescriptionArray[i].accessLocation);
            var accessDescription = new _DERSequence({'array':[o, gn]});
            array.push(accessDescription);
        }
        this.asn1ExtnValue = new _DERSequence({'array':array});
    };

    this.getExtnValueHex = function() {
        return this.asn1ExtnValue.getEncodedHex();
    };

    this.oid = "1.3.6.1.5.5.7.1.1";
    if (params !== undefined) {
        if (params.array !== undefined) {
            this.setAccessDescriptionArray(params.array);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.AuthorityInfoAccess, KJUR.asn1.x509.Extension);

/**
 * SubjectAltName ASN.1 structure class<br/>
 * @name KJUR.asn1.x509.SubjectAltName
 * @class SubjectAltName ASN.1 structure class
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.x509.Extension
 * @since jsrsasign 6.2.3 asn1x509 1.0.19
 * @see KJUR.asn1.x509.GeneralNames
 * @see KJUR.asn1.x509.GeneralName
 * @description
 * This class provides X.509v3 SubjectAltName extension.
 * <pre>
 * id-ce-subjectAltName OBJECT IDENTIFIER ::=  { id-ce 17 }
 * SubjectAltName ::= GeneralNames
 * GeneralNames ::= SEQUENCE SIZE (1..MAX) OF GeneralName
 * GeneralName ::= CHOICE {
 *   otherName                  [0] OtherName,
 *   rfc822Name                 [1] IA5String,
 *   dNSName                    [2] IA5String,
 *   x400Address                [3] ORAddress,
 *   directoryName              [4] Name,
 *   ediPartyName               [5] EDIPartyName,
 *   uniformResourceIdentifier  [6] IA5String,
 *   iPAddress                  [7] OCTET STRING,
 *   registeredID               [8] OBJECT IDENTIFIER }
 * </pre>
 * @example
 * e1 = new KJUR.asn1.x509.SubjectAltName({
 *   critical: true,
 *   array: [{uri: 'http://aaa.com/'}, {uri: 'http://bbb.com/'}]
 * });
 */
KJUR.asn1.x509.SubjectAltName = function(params) {
    KJUR.asn1.x509.SubjectAltName.superclass.constructor.call(this, params)

    this.setNameArray = function(paramsArray) {
	this.asn1ExtnValue = new KJUR.asn1.x509.GeneralNames(paramsArray);
    };

    this.getExtnValueHex = function() {
        return this.asn1ExtnValue.getEncodedHex();
    };

    this.oid = "2.5.29.17";
    if (params !== undefined) {
        if (params.array !== undefined) {
            this.setNameArray(params.array);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.SubjectAltName, KJUR.asn1.x509.Extension);

/**
 * IssuerAltName ASN.1 structure class<br/>
 * @name KJUR.asn1.x509.IssuerAltName
 * @class IssuerAltName ASN.1 structure class
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.x509.Extension
 * @since jsrsasign 6.2.3 asn1x509 1.0.19
 * @see KJUR.asn1.x509.GeneralNames
 * @see KJUR.asn1.x509.GeneralName
 * @description
 * This class provides X.509v3 IssuerAltName extension.
 * <pre>
 * id-ce-subjectAltName OBJECT IDENTIFIER ::=  { id-ce 18 }
 * IssuerAltName ::= GeneralNames
 * GeneralNames ::= SEQUENCE SIZE (1..MAX) OF GeneralName
 * GeneralName ::= CHOICE {
 *   otherName                  [0] OtherName,
 *   rfc822Name                 [1] IA5String,
 *   dNSName                    [2] IA5String,
 *   x400Address                [3] ORAddress,
 *   directoryName              [4] Name,
 *   ediPartyName               [5] EDIPartyName,
 *   uniformResourceIdentifier  [6] IA5String,
 *   iPAddress                  [7] OCTET STRING,
 *   registeredID               [8] OBJECT IDENTIFIER }
 * </pre>
 * @example
 * e1 = new KJUR.asn1.x509.IssuerAltName({
 *   critical: true,
 *   array: [{uri: 'http://aaa.com/'}, {uri: 'http://bbb.com/'}]
 * });
 */
KJUR.asn1.x509.IssuerAltName = function(params) {
    KJUR.asn1.x509.IssuerAltName.superclass.constructor.call(this, params)

    this.setNameArray = function(paramsArray) {
	this.asn1ExtnValue = new KJUR.asn1.x509.GeneralNames(paramsArray);
    };

    this.getExtnValueHex = function() {
        return this.asn1ExtnValue.getEncodedHex();
    };

    this.oid = "2.5.29.18";
    if (params !== undefined) {
        if (params.array !== undefined) {
            this.setNameArray(params.array);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.IssuerAltName, KJUR.asn1.x509.Extension);

// === END   X.509v3 Extensions Related =======================================

// === BEGIN CRL Related ===================================================
/**
 * X.509 CRL class to sign and generate hex encoded CRL
 * @name KJUR.asn1.x509.CRL
 * @class X.509 CRL class to sign and generate hex encoded certificate
 * @param {Array} params associative array of parameters (ex. {'tbsobj': obj, 'rsaprvkey': key})
 * @extends KJUR.asn1.ASN1Object
 * @since 1.0.3
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>tbsobj - specify {@link KJUR.asn1.x509.TBSCertList} object to be signed</li>
 * <li>rsaprvkey - specify {@link RSAKey} object CA private key</li>
 * </ul>
 * NOTE: 'params' can be omitted.
 * <h4>EXAMPLE</h4>
 * @example
 * var prvKey = new RSAKey(); // CA's private key
 * prvKey.readPrivateKeyFromASN1HexString("3080...");
 * var crl = new KJUR.asn1x509.CRL({'tbsobj': tbs, 'prvkeyobj': prvKey});
 * crl.sign(); // issue CRL by CA's private key
 * var hCRL = crl.getEncodedHex();
 *
 * // CertificateList  ::=  SEQUENCE  {
 * //     tbsCertList          TBSCertList,
 * //     signatureAlgorithm   AlgorithmIdentifier,
 * //     signatureValue       BIT STRING  }
 */
KJUR.asn1.x509.CRL = function(params) {
    KJUR.asn1.x509.CRL.superclass.constructor.call(this);

    var asn1TBSCertList = null,
	asn1SignatureAlg = null,
	asn1Sig = null,
	hexSig = null,
	prvKey = null;

    /**
     * sign TBSCertList and set signature value internally
     * @name sign
     * @memberOf KJUR.asn1.x509.CRL#
     * @function
     * @description
     * @example
     * var cert = new KJUR.asn1.x509.CRL({'tbsobj': tbs, 'prvkeyobj': prvKey});
     * cert.sign();
     */
    this.sign = function() {
        this.asn1SignatureAlg = this.asn1TBSCertList.asn1SignatureAlg;

        sig = new KJUR.crypto.Signature({'alg': 'SHA1withRSA', 'prov': 'cryptojs/jsrsa'});
        sig.init(this.prvKey);
        sig.updateHex(this.asn1TBSCertList.getEncodedHex());
        this.hexSig = sig.sign();

        this.asn1Sig = new KJUR.asn1.DERBitString({'hex': '00' + this.hexSig});

        var seq = new KJUR.asn1.DERSequence({'array': [this.asn1TBSCertList,
                                                       this.asn1SignatureAlg,
                                                       this.asn1Sig]});
        this.hTLV = seq.getEncodedHex();
        this.isModified = false;
    };

    this.getEncodedHex = function() {
        if (this.isModified == false && this.hTLV != null) return this.hTLV;
        throw "not signed yet";
    };

    /**
     * get PEM formatted CRL string after signed
     * @name getPEMString
     * @memberOf KJUR.asn1.x509.CRL#
     * @function
     * @return PEM formatted string of certificate
     * @description
     * @example
     * var cert = new KJUR.asn1.x509.CRL({'tbsobj': tbs, 'rsaprvkey': prvKey});
     * cert.sign();
     * var sPEM =  cert.getPEMString();
     */
    this.getPEMString = function() {
        var pemBody = hextob64nl(this.getEncodedHex());
        return "-----BEGIN X509 CRL-----\r\n" + 
	    pemBody + 
	    "\r\n-----END X509 CRL-----\r\n";
    };

    if (params !== undefined) {
        if (params.tbsobj !== undefined) {
            this.asn1TBSCertList = params.tbsobj;
        }
        if (params.prvkeyobj !== undefined) {
            this.prvKey = params.prvkeyobj;
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.CRL, KJUR.asn1.ASN1Object);

/**
 * ASN.1 TBSCertList structure class for CRL
 * @name KJUR.asn1.x509.TBSCertList
 * @class ASN.1 TBSCertList structure class for CRL
 * @param {Array} params associative array of parameters (ex. {})
 * @extends KJUR.asn1.ASN1Object
 * @since 1.0.3
 * @description
 * <br/>
 * <h4>EXAMPLE</h4>
 * @example
 *  var o = new KJUR.asn1.x509.TBSCertList();
 *  o.setSignatureAlgByParam({'name': 'SHA1withRSA'});
 *  o.setIssuerByParam({'str': '/C=US/O=a'});
 *  o.setNotThisUpdateByParam({'str': '130504235959Z'});
 *  o.setNotNextUpdateByParam({'str': '140504235959Z'});
 *  o.addRevokedCert({'int': 4}, {'str':'130514235959Z'}));
 *  o.addRevokedCert({'hex': '0f34dd'}, {'str':'130514235959Z'}));
 *
 * // TBSCertList  ::=  SEQUENCE  {
 * //        version                 Version OPTIONAL,
 * //                                     -- if present, MUST be v2
 * //        signature               AlgorithmIdentifier,
 * //        issuer                  Name,
 * //        thisUpdate              Time,
 * //        nextUpdate              Time OPTIONAL,
 * //        revokedCertificates     SEQUENCE OF SEQUENCE  {
 * //             userCertificate         CertificateSerialNumber,
 * //             revocationDate          Time,
 * //             crlEntryExtensions      Extensions OPTIONAL
 * //                                      -- if present, version MUST be v2
 * //                                  }  OPTIONAL,
 * //        crlExtensions           [0]  EXPLICIT Extensions OPTIONAL
 */
KJUR.asn1.x509.TBSCertList = function(params) {
    KJUR.asn1.x509.TBSCertList.superclass.constructor.call(this);
    var aRevokedCert = null,
	_KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_Time = _KJUR_asn1_x509.Time;

    /**
     * set signature algorithm field by parameter
     * @name setSignatureAlgByParam
     * @memberOf KJUR.asn1.x509.TBSCertList#
     * @function
     * @param {Array} algIdParam AlgorithmIdentifier parameter
     * @description
     * @example
     * tbsc.setSignatureAlgByParam({'name': 'SHA1withRSA'});
     */
    this.setSignatureAlgByParam = function(algIdParam) {
        this.asn1SignatureAlg = 
	    new _KJUR_asn1_x509.AlgorithmIdentifier(algIdParam);
    };

    /**
     * set issuer name field by parameter
     * @name setIssuerByParam
     * @memberOf KJUR.asn1.x509.TBSCertList#
     * @function
     * @param {Array} x500NameParam X500Name parameter
     * @description
     * @example
     * tbsc.setIssuerParam({'str': '/C=US/CN=b'});
     * @see KJUR.asn1.x509.X500Name
     */
    this.setIssuerByParam = function(x500NameParam) {
        this.asn1Issuer = new _KJUR_asn1_x509.X500Name(x500NameParam);
    };

    /**
     * set thisUpdate field by parameter
     * @name setThisUpdateByParam
     * @memberOf KJUR.asn1.x509.TBSCertList#
     * @function
     * @param {Array} timeParam Time parameter
     * @description
     * @example
     * tbsc.setThisUpdateByParam({'str': '130508235959Z'});
     * @see KJUR.asn1.x509.Time
     */
    this.setThisUpdateByParam = function(timeParam) {
        this.asn1ThisUpdate = new _Time(timeParam);
    };

    /**
     * set nextUpdate field by parameter
     * @name setNextUpdateByParam
     * @memberOf KJUR.asn1.x509.TBSCertList#
     * @function
     * @param {Array} timeParam Time parameter
     * @description
     * @example
     * tbsc.setNextUpdateByParam({'str': '130508235959Z'});
     * @see KJUR.asn1.x509.Time
     */
    this.setNextUpdateByParam = function(timeParam) {
        this.asn1NextUpdate = new _Time(timeParam);
    };

    /**
     * add revoked certificate by parameter
     * @name addRevokedCert
     * @memberOf KJUR.asn1.x509.TBSCertList#
     * @function
     * @param {Array} snParam DERInteger parameter for certificate serial number
     * @param {Array} timeParam Time parameter for revocation date
     * @description
     * @example
     * tbsc.addRevokedCert({'int': 3}, {'str': '130508235959Z'});
     * @see KJUR.asn1.x509.Time
     */
    this.addRevokedCert = function(snParam, timeParam) {
        var param = {};
        if (snParam != undefined && snParam != null)
	    param['sn'] = snParam;
        if (timeParam != undefined && timeParam != null)
	    param['time'] = timeParam;
        var o = new _KJUR_asn1_x509.CRLEntry(param);
        this.aRevokedCert.push(o);
    };

    this.getEncodedHex = function() {
        this.asn1Array = new Array();

        if (this.asn1Version != null) this.asn1Array.push(this.asn1Version);
        this.asn1Array.push(this.asn1SignatureAlg);
        this.asn1Array.push(this.asn1Issuer);
        this.asn1Array.push(this.asn1ThisUpdate);
        if (this.asn1NextUpdate != null) this.asn1Array.push(this.asn1NextUpdate);

        if (this.aRevokedCert.length > 0) {
            var seq = new _DERSequence({'array': this.aRevokedCert});
            this.asn1Array.push(seq);
        }

        var o = new _DERSequence({"array": this.asn1Array});
        this.hTLV = o.getEncodedHex();
        this.isModified = false;
        return this.hTLV;
    };

    this._initialize = function() {
        this.asn1Version = null;
        this.asn1SignatureAlg = null;
        this.asn1Issuer = null;
        this.asn1ThisUpdate = null;
        this.asn1NextUpdate = null;
        this.aRevokedCert = new Array();
    };

    this._initialize();
};
YAHOO.lang.extend(KJUR.asn1.x509.TBSCertList, KJUR.asn1.ASN1Object);

/**
 * ASN.1 CRLEntry structure class for CRL
 * @name KJUR.asn1.x509.CRLEntry
 * @class ASN.1 CRLEntry structure class for CRL
 * @param {Array} params associative array of parameters (ex. {})
 * @extends KJUR.asn1.ASN1Object
 * @since 1.0.3
 * @description
 * @example
 * var e = new KJUR.asn1.x509.CRLEntry({'time': {'str': '130514235959Z'}, 'sn': {'int': 234}});
 *
 * // revokedCertificates     SEQUENCE OF SEQUENCE  {
 * //     userCertificate         CertificateSerialNumber,
 * //     revocationDate          Time,
 * //     crlEntryExtensions      Extensions OPTIONAL
 * //                             -- if present, version MUST be v2 }
 */
KJUR.asn1.x509.CRLEntry = function(params) {
    KJUR.asn1.x509.CRLEntry.superclass.constructor.call(this);
    var sn = null,
	time = null,
	_KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1;

    /**
     * set DERInteger parameter for serial number of revoked certificate
     * @name setCertSerial
     * @memberOf KJUR.asn1.x509.CRLEntry
     * @function
     * @param {Array} intParam DERInteger parameter for certificate serial number
     * @description
     * @example
     * entry.setCertSerial({'int': 3});
     */
    this.setCertSerial = function(intParam) {
        this.sn = new _KJUR_asn1.DERInteger(intParam);
    };

    /**
     * set Time parameter for revocation date
     * @name setRevocationDate
     * @memberOf KJUR.asn1.x509.CRLEntry
     * @function
     * @param {Array} timeParam Time parameter for revocation date
     * @description
     * @example
     * entry.setRevocationDate({'str': '130508235959Z'});
     */
    this.setRevocationDate = function(timeParam) {
        this.time = new _KJUR_asn1.x509.Time(timeParam);
    };

    this.getEncodedHex = function() {
        var o = new _KJUR_asn1.DERSequence({"array": [this.sn, this.time]});
        this.TLV = o.getEncodedHex();
        return this.TLV;
    };

    if (params !== undefined) {
        if (params.time !== undefined) {
            this.setRevocationDate(params.time);
        }
        if (params.sn !== undefined) {
            this.setCertSerial(params.sn);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.CRLEntry, KJUR.asn1.ASN1Object);

// === END   CRL Related ===================================================

// === BEGIN X500Name Related =================================================
/**
 * X500Name ASN.1 structure class
 * @name KJUR.asn1.x509.X500Name
 * @class X500Name ASN.1 structure class
 * @param {Array} params associative array of parameters (ex. {'str': '/C=US/O=a'})
 * @extends KJUR.asn1.ASN1Object
 * @see KJUR.asn1.x509.X500Name
 * @see KJUR.asn1.x509.RDN
 * @see KJUR.asn1.x509.AttributeTypeAndValue
 * @description
 * This class provides DistinguishedName ASN.1 class structure
 * defined in <a href="https://tools.ietf.org/html/rfc2253#section-2">RFC 2253 section 2</a>.
 * <blockquote><pre>
 * DistinguishedName ::= RDNSequence
 *
 * RDNSequence ::= SEQUENCE OF RelativeDistinguishedName
 *
 * RelativeDistinguishedName ::= SET SIZE (1..MAX) OF
 *   AttributeTypeAndValue
 *
 * AttributeTypeAndValue ::= SEQUENCE {
 *   type  AttributeType,
 *   value AttributeValue }
 * </pre></blockquote>
 * <br/>
 * For string representation of distinguished name in jsrsasign,
 * OpenSSL oneline format is used. Please see <a href="https://github.com/kjur/jsrsasign/wiki/NOTE-distinguished-name-representation-in-jsrsasign">wiki article</a> for it.
 * <br/>
 * NOTE: Multi-valued RDN is supported since jsrsasign 6.2.1 asn1x509 1.0.17.
 * @example
 * // 1. construct with string
 * o = new KJUR.asn1.x509.X500Name({str: "/C=US/O=aaa/OU=bbb/CN=foo@example.com"});
 * o = new KJUR.asn1.x509.X500Name({str: "/C=US/O=aaa+CN=contact@example.com"}); // multi valued
 * // 2. construct by object
 * o = new KJUR.asn1.x509.X500Name({C: "US", O: "aaa", CN: "http://example.com/"});
 */
KJUR.asn1.x509.X500Name = function(params) {
    KJUR.asn1.x509.X500Name.superclass.constructor.call(this);
    this.asn1Array = new Array();
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_pemtohex = pemtohex;

    /**
     * set DN by OpenSSL oneline distinguished name string<br/>
     * @name setByString
     * @memberOf KJUR.asn1.x509.X500Name#
     * @function
     * @param {String} dnStr distinguished name by string (ex. /C=US/O=aaa)
     * @description
     * Sets distinguished name by string. 
     * dnStr must be formatted as 
     * "/type0=value0/type1=value1/type2=value2...".
     * No need to escape a slash in an attribute value.
     * @example
     * name = new KJUR.asn1.x509.X500Name();
     * name.setByString("/C=US/O=aaa/OU=bbb/CN=foo@example.com");
     * // no need to escape slash in an attribute value
     * name.setByString("/C=US/O=aaa/CN=1980/12/31");
     */
    this.setByString = function(dnStr) {
        var a = dnStr.split('/');
        a.shift();

	var a1 = [];
	for (var i = 0; i < a.length; i++) {
	  if (a[i].match(/^[^=]+=.+$/)) {
	    a1.push(a[i]);
	  } else {
	    var lastidx = a1.length - 1;
	    a1[lastidx] = a1[lastidx] + "/" + a[i];
	  }
	}

        for (var i = 0; i < a1.length; i++) {
            this.asn1Array.push(new _KJUR_asn1_x509.RDN({'str':a1[i]}));
        }
    };

    /**
     * set DN by LDAP(RFC 2253) distinguished name string<br/>
     * @name setByLdapString
     * @memberOf KJUR.asn1.x509.X500Name#
     * @function
     * @param {String} dnStr distinguished name by LDAP string (ex. O=aaa,C=US)
     * @since jsrsasign 6.2.2 asn1x509 1.0.18
     * @description
     * @example
     * name = new KJUR.asn1.x509.X500Name();
     * name.setByLdapString("CN=foo@example.com,OU=bbb,O=aaa,C=US");
     */
    this.setByLdapString = function(dnStr) {
	var oneline = _KJUR_asn1_x509.X500Name.ldapToOneline(dnStr);
	this.setByString(oneline);
    };

    /**
     * set DN by associative array<br/>
     * @name setByObject
     * @memberOf KJUR.asn1.x509.X500Name#
     * @function
     * @param {Array} dnObj associative array of DN (ex. {C: "US", O: "aaa"})
     * @since jsrsasign 4.9. asn1x509 1.0.13
     * @description
     * @example
     * name = new KJUR.asn1.x509.X500Name();
     * name.setByObject({C: "US", O: "aaa", CN="http://example.com/"1});
     */
    this.setByObject = function(dnObj) {
        // Get all the dnObject attributes and stuff them in the ASN.1 array.
        for (var x in dnObj) {
            if (dnObj.hasOwnProperty(x)) {
                var newRDN = new KJUR.asn1.x509.RDN(
                    {'str': x + '=' + dnObj[x]});
                // Initialize or push into the ANS1 array.
                this.asn1Array ? this.asn1Array.push(newRDN)
                    : this.asn1Array = [newRDN];
            }
        }
    };

    this.getEncodedHex = function() {
        if (typeof this.hTLV == "string") return this.hTLV;
        var o = new _KJUR_asn1.DERSequence({"array": this.asn1Array});
        this.hTLV = o.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (params.str !== undefined) {
            this.setByString(params.str);
        } else if (params.ldapstr !== undefined) {
	    this.setByLdapString(params.ldapstr);
        // If params is an object, then set the ASN1 array just using the object
        // attributes. This is nice for fields that have lots of special
        // characters (i.e. CN: 'https://www.github.com/kjur//').
        } else if (typeof params === "object") {
            this.setByObject(params);
        }

        if (params.certissuer !== undefined) {
            var x = new X509();
            x.hex = _pemtohex(params.certissuer);
            this.hTLV = x.getIssuerHex();
        }
        if (params.certsubject !== undefined) {
            var x = new X509();
            x.hex = _pemtohex(params.certsubject);
            this.hTLV = x.getSubjectHex();
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.X500Name, KJUR.asn1.ASN1Object);

/**
 * convert OpenSSL oneline distinguished name format string to LDAP(RFC 2253) format<br/>
 * @name onelineToLDAP
 * @memberOf KJUR.asn1.x509.X500Name
 * @function
 * @param {String} s distinguished name string in OpenSSL oneline format (ex. /C=US/O=test)
 * @return {String} distinguished name string in LDAP(RFC 2253) format (ex. O=test,C=US)
 * @since jsrsasign 6.2.2 asn1x509 1.0.18
 * @description
 * This static method converts a distinguished name string in OpenSSL oneline 
 * format to LDAP(RFC 2253) format.
 * @see <a href="https://github.com/kjur/jsrsasign/wiki/NOTE-distinguished-name-representation-in-jsrsasign">jsrsasign wiki: distinguished name string difference between OpenSSL oneline and LDAP(RFC 2253)</a>
 * @example
 * KJUR.asn1.x509.X500Name.onelineToLDAP("/C=US/O=test") &rarr; 'O=test,C=US'
 * KJUR.asn1.x509.X500Name.onelineToLDAP("/C=US/O=a,a") &rarr; 'O=a\,a,C=US'
 */
KJUR.asn1.x509.X500Name.onelineToLDAP = function(s) {
    if (s.substr(0, 1) !== "/") throw "malformed input";

    var result = "";
    s = s.substr(1);

    var a = s.split("/");
    a.reverse();
    a = a.map(function(s) {return s.replace(/,/, "\\,")});

    return a.join(",");
};

/**
 * convert LDAP(RFC 2253) distinguished name format string to OpenSSL oneline format<br/>
 * @name ldapToOneline
 * @memberOf KJUR.asn1.x509.X500Name
 * @function
 * @param {String} s distinguished name string in LDAP(RFC 2253) format (ex. O=test,C=US)
 * @return {String} distinguished name string in OpenSSL oneline format (ex. /C=US/O=test)
 * @since jsrsasign 6.2.2 asn1x509 1.0.18
 * @description
 * This static method converts a distinguished name string in 
 * LDAP(RFC 2253) format to OpenSSL oneline format.
 * @see <a href="https://github.com/kjur/jsrsasign/wiki/NOTE-distinguished-name-representation-in-jsrsasign">jsrsasign wiki: distinguished name string difference between OpenSSL oneline and LDAP(RFC 2253)</a>
 * @example
 * KJUR.asn1.x509.X500Name.ldapToOneline('O=test,C=US') &rarr; '/C=US/O=test'
 * KJUR.asn1.x509.X500Name.ldapToOneline('O=a\,a,C=US') &rarr; '/C=US/O=a,a'
 * KJUR.asn1.x509.X500Name.ldapToOneline('O=a/a,C=US')  &rarr; '/C=US/O=a\/a'
 */
KJUR.asn1.x509.X500Name.ldapToOneline = function(s) {
    var a = s.split(",");

    // join \,
    var isBSbefore = false;
    var a2 = [];
    for (var i = 0; a.length > 0; i++) {
	var item = a.shift();
	//console.log("item=" + item);

	if (isBSbefore === true) {
	    var a2last = a2.pop();
	    var newitem = (a2last + "," + item).replace(/\\,/g, ",");
	    a2.push(newitem);
	    isBSbefore = false;
	} else {
	    a2.push(item);
	}

	if (item.substr(-1, 1) === "\\") isBSbefore = true;
    }

    a2 = a2.map(function(s) {return s.replace("/", "\\/")});
    a2.reverse();
    return "/" + a2.join("/");
};

/**
 * RDN (Relative Distinguished Name) ASN.1 structure class
 * @name KJUR.asn1.x509.RDN
 * @class RDN (Relative Distinguished Name) ASN.1 structure class
 * @param {Array} params associative array of parameters (ex. {'str': 'C=US'})
 * @extends KJUR.asn1.ASN1Object
 * @see KJUR.asn1.x509.X500Name
 * @see KJUR.asn1.x509.RDN
 * @see KJUR.asn1.x509.AttributeTypeAndValue
 * @description
 * This class provides RelativeDistinguishedName ASN.1 class structure
 * defined in <a href="https://tools.ietf.org/html/rfc2253#section-2">RFC 2253 section 2</a>.
 * <blockquote><pre>
 * RelativeDistinguishedName ::= SET SIZE (1..MAX) OF
 *   AttributeTypeAndValue
 *
 * AttributeTypeAndValue ::= SEQUENCE {
 *   type  AttributeType,
 *   value AttributeValue }
 * </pre></blockquote>
 * <br/>
 * NOTE: Multi-valued RDN is supported since jsrsasign 6.2.1 asn1x509 1.0.17.
 * @example
 * rdn = new KJUR.asn1.x509.RDN({str: "CN=test"});
 * rdn = new KJUR.asn1.x509.RDN({str: "O=a+O=bb+O=c"}); // multi-valued
 * rdn = new KJUR.asn1.x509.RDN({str: "O=a+O=b\\+b+O=c"}); // plus escaped
 * rdn = new KJUR.asn1.x509.RDN({str: "O=a+O=\"b+b\"+O=c"}); // double quoted
 */
KJUR.asn1.x509.RDN = function(params) {
    KJUR.asn1.x509.RDN.superclass.constructor.call(this);
    this.asn1Array = new Array();

    /**
     * add one AttributeTypeAndValue by string<br/>
     * @name addByString
     * @memberOf KJUR.asn1.x509.RDN#
     * @function
     * @param {String} s string of AttributeTypeAndValue
     * @return {Object} unspecified
     * @description
     * This method add one AttributeTypeAndValue to RDN object.
     * @example
     * rdn = new KJUR.asn1.x509.RDN();
     * rdn.addByString("CN=john");
     * rdn.addByString("serialNumber=1234"); // for multi-valued RDN
     */
    this.addByString = function(s) {
        this.asn1Array.push(new KJUR.asn1.x509.AttributeTypeAndValue({'str': s}));
    };

    /**
     * add one AttributeTypeAndValue by multi-valued string<br/>
     * @name addByMultiValuedString
     * @memberOf KJUR.asn1.x509.RDN#
     * @function
     * @param {String} s string of multi-valued RDN
     * @return {Object} unspecified
     * @since jsrsasign 6.2.1 asn1x509 1.0.17
     * @description
     * This method add multi-valued RDN to RDN object.
     * @example
     * rdn = new KJUR.asn1.x509.RDN();
     * rdn.addByMultiValuedString("CN=john+O=test");
     * rdn.addByMultiValuedString("O=a+O=b\+b\+b+O=c"); // multi-valued RDN with quoted plus
     * rdn.addByMultiValuedString("O=a+O=\"b+b+b\"+O=c"); // multi-valued RDN with quoted quotation
     */
    this.addByMultiValuedString = function(s) {
	var a = KJUR.asn1.x509.RDN.parseString(s);
	for (var i = 0; i < a.length; i++) {
	    this.addByString(a[i]);
	}
    };

    this.getEncodedHex = function() {
        var o = new KJUR.asn1.DERSet({"array": this.asn1Array});
        this.TLV = o.getEncodedHex();
        return this.TLV;
    };

    if (params !== undefined) {
        if (params.str !== undefined) {
            this.addByMultiValuedString(params.str);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.RDN, KJUR.asn1.ASN1Object);

/**
 * parse multi-valued RDN string and split into array of 'AttributeTypeAndValue'<br/>
 * @name parseString
 * @memberOf KJUR.asn1.x509.RDN
 * @function
 * @param {String} s multi-valued string of RDN
 * @return {Array} array of string of AttributeTypeAndValue
 * @since jsrsasign 6.2.1 asn1x509 1.0.17
 * @description
 * This static method parses multi-valued RDN string and split into
 * array of AttributeTypeAndValue.
 * @example
 * KJUR.asn1.x509.RDN.parseString("CN=john") &rarr; ["CN=john"]
 * KJUR.asn1.x509.RDN.parseString("CN=john+OU=test") &rarr; ["CN=john", "OU=test"]
 * KJUR.asn1.x509.RDN.parseString('CN="jo+hn"+OU=test') &rarr; ["CN=jo+hn", "OU=test"]
 * KJUR.asn1.x509.RDN.parseString('CN=jo\+hn+OU=test') &rarr; ["CN=jo+hn", "OU=test"]
 * KJUR.asn1.x509.RDN.parseString("CN=john+OU=test+OU=t1") &rarr; ["CN=john", "OU=test", "OU=t1"]
 */
KJUR.asn1.x509.RDN.parseString = function(s) {
    var a = s.split(/\+/);

    // join \+
    var isBSbefore = false;
    var a2 = [];
    for (var i = 0; a.length > 0; i++) {
	var item = a.shift();
	//console.log("item=" + item);

	if (isBSbefore === true) {
	    var a2last = a2.pop();
	    var newitem = (a2last + "+" + item).replace(/\\\+/g, "+");
	    a2.push(newitem);
	    isBSbefore = false;
	} else {
	    a2.push(item);
	}

	if (item.substr(-1, 1) === "\\") isBSbefore = true;
    }

    // join quote
    var beginQuote = false;
    var a3 = [];
    for (var i = 0; a2.length > 0; i++) {
	var item = a2.shift();

	if (beginQuote === true) {
	    var a3last = a3.pop();
	    if (item.match(/"$/)) {
		var newitem = (a3last + "+" + item).replace(/^([^=]+)="(.*)"$/, "$1=$2");
		a3.push(newitem);
		beginQuote = false;
	    } else {
		a3.push(a3last + "+" + item);
	    }
	} else {
	    a3.push(item);
	}

	if (item.match(/^[^=]+="/)) {
	    //console.log(i + "=" + item);
	    beginQuote = true;
	}
    }

    return a3;
};

/**
 * AttributeTypeAndValue ASN.1 structure class
 * @name KJUR.asn1.x509.AttributeTypeAndValue
 * @class AttributeTypeAndValue ASN.1 structure class
 * @param {Array} params associative array of parameters (ex. {'str': 'C=US'})
 * @extends KJUR.asn1.ASN1Object
 * @description
 * @see KJUR.asn1.x509.X500Name
 * @see KJUR.asn1.x509.RDN
 * @see KJUR.asn1.x509.AttributeTypeAndValue
 * @example
 */
KJUR.asn1.x509.AttributeTypeAndValue = function(params) {
    KJUR.asn1.x509.AttributeTypeAndValue.superclass.constructor.call(this);
    var typeObj = null,
	valueObj = null,
	defaultDSType = "utf8",
	_KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1;

    this.setByString = function(attrTypeAndValueStr) {
        var matchResult = attrTypeAndValueStr.match(/^([^=]+)=(.+)$/);
        if (matchResult) {
            this.setByAttrTypeAndValueStr(matchResult[1], matchResult[2]);
        } else {
            throw "malformed attrTypeAndValueStr: " + attrTypeAndValueStr;
        }
    };

    this.setByAttrTypeAndValueStr = function(shortAttrType, valueStr) {
        this.typeObj = KJUR.asn1.x509.OID.atype2obj(shortAttrType);
        var dsType = defaultDSType;
        if (shortAttrType == "C") dsType = "prn";
        this.valueObj = this.getValueObj(dsType, valueStr);
    };

    this.getValueObj = function(dsType, valueStr) {
        if (dsType == "utf8")   return new _KJUR_asn1.DERUTF8String({"str": valueStr});
        if (dsType == "prn")    return new _KJUR_asn1.DERPrintableString({"str": valueStr});
        if (dsType == "tel")    return new _KJUR_asn1.DERTeletexString({"str": valueStr});
        if (dsType == "ia5")    return new _KJUR_asn1.DERIA5String({"str": valueStr});
        throw "unsupported directory string type: type=" + dsType + " value=" + valueStr;
    };

    this.getEncodedHex = function() {
        var o = new _KJUR_asn1.DERSequence({"array": [this.typeObj, this.valueObj]});
        this.TLV = o.getEncodedHex();
        return this.TLV;
    };

    if (params !== undefined) {
        if (params.str !== undefined) {
            this.setByString(params.str);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.AttributeTypeAndValue, KJUR.asn1.ASN1Object);

// === END   X500Name Related =================================================

// === BEGIN Other ASN1 structure class  ======================================

/**
 * SubjectPublicKeyInfo ASN.1 structure class
 * @name KJUR.asn1.x509.SubjectPublicKeyInfo
 * @class SubjectPublicKeyInfo ASN.1 structure class
 * @param {Object} params parameter for subject public key
 * @extends KJUR.asn1.ASN1Object
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>{@link RSAKey} object</li>
 * <li>{@link KJUR.crypto.ECDSA} object</li>
 * <li>{@link KJUR.crypto.DSA} object</li>
 * </ul>
 * NOTE1: 'params' can be omitted.<br/>
 * NOTE2: DSA/ECDSA key object is also supported since asn1x509 1.0.6.<br/>
 * <h4>EXAMPLE</h4>
 * @example
 * spki = new KJUR.asn1.x509.SubjectPublicKeyInfo(RSAKey_object);
 * spki = new KJUR.asn1.x509.SubjectPublicKeyInfo(KJURcryptoECDSA_object);
 * spki = new KJUR.asn1.x509.SubjectPublicKeyInfo(KJURcryptoDSA_object);
 */
KJUR.asn1.x509.SubjectPublicKeyInfo = function(params) {
    KJUR.asn1.x509.SubjectPublicKeyInfo.superclass.constructor.call(this);
    var asn1AlgId = null,
	asn1SubjPKey = null,
	_KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERInteger = _KJUR_asn1.DERInteger,
	_DERBitString = _KJUR_asn1.DERBitString,
	_DERObjectIdentifier = _KJUR_asn1.DERObjectIdentifier,
	_DERSequence = _KJUR_asn1.DERSequence,
	_newObject = _KJUR_asn1.ASN1Util.newObject,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_AlgorithmIdentifier = _KJUR_asn1_x509.AlgorithmIdentifier,
	_KJUR_crypto = _KJUR.crypto,
	_KJUR_crypto_ECDSA = _KJUR_crypto.ECDSA,
	_KJUR_crypto_DSA = _KJUR_crypto.DSA;

    /*
     * @since asn1x509 1.0.7
     */
    this.getASN1Object = function() {
        if (this.asn1AlgId == null || this.asn1SubjPKey == null)
            throw "algId and/or subjPubKey not set";
        var o = new _DERSequence({'array':
                                  [this.asn1AlgId, this.asn1SubjPKey]});
        return o;
    };

    this.getEncodedHex = function() {
        var o = this.getASN1Object();
        this.hTLV = o.getEncodedHex();
        return this.hTLV;
    };

    /**
     * @name setPubKey
     * @memberOf KJUR.asn1.x509.SubjectPublicKeyInfo#
     * @function
     * @param {Object} {@link RSAKey}, {@link KJUR.crypto.ECDSA} or {@link KJUR.crypto.DSA} object
     * @since jsrsasign 8.0.0 asn1x509 1.1.0
     * @description
     * @example
     * spki = new KJUR.asn1.x509.SubjectPublicKeyInfo();
     * pubKey = KEYUTIL.getKey(PKCS8PUBKEYPEM);
     * spki.setPubKey(pubKey);
     */
    this.setPubKey = function(key) {
	try {
	    if (key instanceof RSAKey) {
		var asn1RsaPub = _newObject({
		    'seq': [{'int': {'bigint': key.n}}, {'int': {'int': key.e}}]
		});
		var rsaKeyHex = asn1RsaPub.getEncodedHex();
		this.asn1AlgId = new _AlgorithmIdentifier({'name':'rsaEncryption'});
		this.asn1SubjPKey = new _DERBitString({'hex':'00'+rsaKeyHex});
	    }
	} catch(ex) {};

	try {
	    if (key instanceof KJUR.crypto.ECDSA) {
		var asn1Params = new _DERObjectIdentifier({'name': key.curveName});
		this.asn1AlgId =
		    new _AlgorithmIdentifier({'name': 'ecPublicKey',
					      'asn1params': asn1Params});
		this.asn1SubjPKey = new _DERBitString({'hex': '00' + key.pubKeyHex});
	    }
	} catch(ex) {};

	try {
	    if (key instanceof KJUR.crypto.DSA) {
		var asn1Params = new _newObject({
		    'seq': [{'int': {'bigint': key.p}},
			    {'int': {'bigint': key.q}},
			    {'int': {'bigint': key.g}}]
		});
		this.asn1AlgId =
		    new _AlgorithmIdentifier({'name': 'dsa',
					      'asn1params': asn1Params});
		var pubInt = new _DERInteger({'bigint': key.y});
		this.asn1SubjPKey = 
		    new _DERBitString({'hex': '00' + pubInt.getEncodedHex()});
	    }
	} catch(ex) {};
    };

    if (params !== undefined) {
	this.setPubKey(params);
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.SubjectPublicKeyInfo, KJUR.asn1.ASN1Object);

/**
 * Time ASN.1 structure class
 * @name KJUR.asn1.x509.Time
 * @class Time ASN.1 structure class
 * @param {Array} params associative array of parameters (ex. {'str': '130508235959Z'})
 * @extends KJUR.asn1.ASN1Object
 * @description
 * <br/>
 * <h4>EXAMPLES</h4>
 * @example
 * var t1 = new KJUR.asn1.x509.Time{'str': '130508235959Z'} // UTCTime by default
 * var t2 = new KJUR.asn1.x509.Time{'type': 'gen',  'str': '20130508235959Z'} // GeneralizedTime
 */
KJUR.asn1.x509.Time = function(params) {
    KJUR.asn1.x509.Time.superclass.constructor.call(this);
    var type = null,
	timeParams = null,
	_KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERUTCTime = _KJUR_asn1.DERUTCTime,
	_DERGeneralizedTime = _KJUR_asn1.DERGeneralizedTime;

    this.setTimeParams = function(timeParams) {
        this.timeParams = timeParams;
    }

    this.getEncodedHex = function() {
        var o = null;

        if (this.timeParams != null) {
            if (this.type == "utc") {
                o = new _DERUTCTime(this.timeParams);
            } else {
                o = new _DERGeneralizedTime(this.timeParams);
            }
        } else {
            if (this.type == "utc") {
                o = new _DERUTCTime();
            } else {
                o = new _DERGeneralizedTime();
            }
        }
        this.TLV = o.getEncodedHex();
        return this.TLV;
    };

    this.type = "utc";
    if (params !== undefined) {
        if (params.type !== undefined) {
            this.type = params.type;
        } else {
            if (params.str !== undefined) {
                if (params.str.match(/^[0-9]{12}Z$/)) this.type = "utc";
                if (params.str.match(/^[0-9]{14}Z$/)) this.type = "gen";
            }
        }
        this.timeParams = params;
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.Time, KJUR.asn1.ASN1Object);

/**
 * AlgorithmIdentifier ASN.1 structure class
 * @name KJUR.asn1.x509.AlgorithmIdentifier
 * @class AlgorithmIdentifier ASN.1 structure class
 * @param {Array} params associative array of parameters (ex. {'name': 'SHA1withRSA'})
 * @extends KJUR.asn1.ASN1Object
 * @description
 * The 'params' argument is an associative array and has following parameters:
 * <ul>
 * <li>name: algorithm name (MANDATORY, ex. sha1, SHA256withRSA)</li>
 * <li>asn1params: explicitly specify ASN.1 object for algorithm.
 * (OPTION)</li>
 * <li>paramempty: set algorithm parameter to NULL by force.
 * If paramempty is false, algorithm parameter will be set automatically.
 * If paramempty is false and algorithm name is "*withDSA" or "withECDSA" parameter field of
 * AlgorithmIdentifier will be ommitted otherwise
 * it will be NULL by default.
 * (OPTION, DEFAULT = false)</li>
 * </ul>
 * @example
 * algId = new KJUR.asn1.x509.AlgorithmIdentifier({name: "sha1"});
 * // set parameter to NULL authomatically if algorithm name is "*withRSA".
 * algId = new KJUR.asn1.x509.AlgorithmIdentifier({name: "SHA256withRSA"});
 * // set parameter to NULL authomatically if algorithm name is "rsaEncryption".
 * algId = new KJUR.asn1.x509.AlgorithmIdentifier({name: "rsaEncryption"});
 * // SHA256withRSA and set parameter empty by force
 * algId = new KJUR.asn1.x509.AlgorithmIdentifier({name: "SHA256withRSA", paramempty: true});
 */
KJUR.asn1.x509.AlgorithmIdentifier = function(params) {
    KJUR.asn1.x509.AlgorithmIdentifier.superclass.constructor.call(this);
    this.nameAlg = null;
    this.asn1Alg = null;
    this.asn1Params = null;
    this.paramEmpty = false;
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1;

    this.getEncodedHex = function() {
        if (this.nameAlg === null && this.asn1Alg === null) {
            throw "algorithm not specified";
        }
        if (this.nameAlg !== null && this.asn1Alg === null) {
            this.asn1Alg = _KJUR_asn1.x509.OID.name2obj(this.nameAlg);
        }
        var a = [this.asn1Alg];
        if (this.asn1Params !== null) a.push(this.asn1Params);

        var o = new _KJUR_asn1.DERSequence({'array': a});
        this.hTLV = o.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (params.name !== undefined) {
            this.nameAlg = params.name;
        }
        if (params.asn1params !== undefined) {
            this.asn1Params = params.asn1params;
        }
        if (params.paramempty !== undefined) {
            this.paramEmpty = params.paramempty;
        }
    }

    // set algorithm parameters will be ommitted for
    // "*withDSA" or "*withECDSA" otherwise will be NULL.
    if (this.asn1Params === null &&
	this.paramEmpty === false &&
	this.nameAlg !== null) {
	var lcNameAlg = this.nameAlg.toLowerCase();
	if (lcNameAlg.substr(-7, 7) !== "withdsa" &&
	    lcNameAlg.substr(-9, 9) !== "withecdsa") {
            this.asn1Params = new _KJUR_asn1.DERNull();
	}
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.AlgorithmIdentifier, KJUR.asn1.ASN1Object);

/**
 * GeneralName ASN.1 structure class<br/>
 * @name KJUR.asn1.x509.GeneralName
 * @class GeneralName ASN.1 structure class
 * @description
 * <br/>
 * As for argument 'params' for constructor, you can specify one of
 * following properties:
 * <ul>
 * <li>rfc822 - rfc822Name[1] (ex. user1@foo.com)</li>
 * <li>dns - dNSName[2] (ex. foo.com)</li>
 * <li>uri - uniformResourceIdentifier[6] (ex. http://foo.com/)</li>
 * <li>dn - directoryName[4] (ex. /C=US/O=Test)</li>
 * <li>ldapdn - directoryName[4] (ex. O=Test,C=US)</li>
 * <li>certissuer - directoryName[4] (PEM or hex string of cert)</li>
 * <li>certsubj - directoryName[4] (PEM or hex string of cert)</li>
 * <li>ip - iPAddress[7] (ex. 192.168.1.1, 2001:db3::43, 3faa0101...)</li>
 * </ul>
 * NOTE1: certissuer and certsubj were supported since asn1x509 1.0.10.<br/>
 * NOTE2: dn and ldapdn were supported since jsrsasign 6.2.3 asn1x509 1.0.19.<br/>
 * NOTE3: ip were supported since jsrsasign 8.0.10 asn1x509 1.1.4.<br/>
 *
 * Here is definition of the ASN.1 syntax:
 * <pre>
 * -- NOTE: under the CHOICE, it will always be explicit.
 * GeneralName ::= CHOICE {
 *   otherName                  [0] OtherName,
 *   rfc822Name                 [1] IA5String,
 *   dNSName                    [2] IA5String,
 *   x400Address                [3] ORAddress,
 *   directoryName              [4] Name,
 *   ediPartyName               [5] EDIPartyName,
 *   uniformResourceIdentifier  [6] IA5String,
 *   iPAddress                  [7] OCTET STRING,
 *   registeredID               [8] OBJECT IDENTIFIER }
 * </pre>
 *
 * @example
 * gn = new KJUR.asn1.x509.GeneralName({rfc822:     'test@aaa.com'});
 * gn = new KJUR.asn1.x509.GeneralName({dns:        'aaa.com'});
 * gn = new KJUR.asn1.x509.GeneralName({uri:        'http://aaa.com/'});
 * gn = new KJUR.asn1.x509.GeneralName({dn:         '/C=US/O=Test'});
 * gn = new KJUR.asn1.x509.GeneralName({ldapdn:     'O=Test,C=US'});
 * gn = new KJUR.asn1.x509.GeneralName({certissuer: certPEM});
 * gn = new KJUR.asn1.x509.GeneralName({certsubj:   certPEM});
 * gn = new KJUR.asn1.x509.GeneralName({ip:         '192.168.1.1'});
 * gn = new KJUR.asn1.x509.GeneralName({ip:         '2001:db4::4:1'});
 * gn = new KJUR.asn1.x509.GeneralName({ip:         'c0a80101'});
 */
KJUR.asn1.x509.GeneralName = function(params) {
    KJUR.asn1.x509.GeneralName.superclass.constructor.call(this);
    var asn1Obj = null,
	type = null,
	pTag = {rfc822: '81', dns: '82', dn: 'a4',  uri: '86', ip: '87'},
	_KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_DEROctetString = _KJUR_asn1.DEROctetString,
	_DERIA5String = _KJUR_asn1.DERIA5String,
	_DERTaggedObject = _KJUR_asn1.DERTaggedObject,
	_ASN1Object = _KJUR_asn1.ASN1Object,
	_X500Name = _KJUR_asn1.x509.X500Name,
	_pemtohex = pemtohex;
	
    this.explicit = false;

    this.setByParam = function(params) {
        var str = null;
        var v = null;

	if (params === undefined) return;

        if (params.rfc822 !== undefined) {
            this.type = 'rfc822';
            v = new _DERIA5String({str: params[this.type]});
        }

        if (params.dns !== undefined) {
            this.type = 'dns';
            v = new _DERIA5String({str: params[this.type]});
        }

        if (params.uri !== undefined) {
            this.type = 'uri';
            v = new _DERIA5String({str: params[this.type]});
        }

        if (params.dn !== undefined) {
	    this.type = 'dn';
	    this.explicit = true;
	    v = new _X500Name({str: params.dn});
	}

        if (params.ldapdn !== undefined) {
	    this.type = 'dn';
	    this.explicit = true;
	    v = new _X500Name({ldapstr: params.ldapdn});
	}

	if (params.certissuer !== undefined) {
	    this.type = 'dn';
	    this.explicit = true;
	    var certStr = params.certissuer;
	    var certHex = null;

	    if (certStr.match(/^[0-9A-Fa-f]+$/)) {
		certHex == certStr;
            }

	    if (certStr.indexOf("-----BEGIN ") != -1) {
		certHex = _pemtohex(certStr);
	    }

	    if (certHex == null) throw "certissuer param not cert";
	    var x = new X509();
	    x.hex = certHex;
	    var dnHex = x.getIssuerHex();
	    v = new _ASN1Object();
	    v.hTLV = dnHex;
	}

	if (params.certsubj !== undefined) {
	    this.type = 'dn';
	    this.explicit = true;
	    var certStr = params.certsubj;
	    var certHex = null;
	    if (certStr.match(/^[0-9A-Fa-f]+$/)) {
		certHex == certStr;
            }
	    if (certStr.indexOf("-----BEGIN ") != -1) {
		certHex = _pemtohex(certStr);
	    }
	    if (certHex == null) throw "certsubj param not cert";
	    var x = new X509();
	    x.hex = certHex;
	    var dnHex = x.getSubjectHex();
	    v = new _ASN1Object();
	    v.hTLV = dnHex;
	}

	if (params.ip !== undefined) {
	    this.type = 'ip';
	    this.explicit = false;
	    var ip = params.ip;
	    var hIP;
	    var malformedIPMsg = "malformed IP address";
	    if (ip.match(/^[0-9.]+[.][0-9.]+$/)) { // ipv4
		hIP = intarystrtohex("[" + ip.split(".").join(",") + "]");
		if (hIP.length !== 8) throw malformedIPMsg;
	    } else if (ip.match(/^[0-9A-Fa-f:]+:[0-9A-Fa-f:]+$/)) { // ipv6
		hIP = ipv6tohex(ip);
	    } else if (ip.match(/^([0-9A-Fa-f][0-9A-Fa-f]){1,}$/)) { // hex
		hIP = ip;
	    } else {
		throw malformedIPMsg;
	    }
	    v = new _DEROctetString({hex: hIP});
	}

        if (this.type == null)
            throw "unsupported type in params=" + params;
        this.asn1Obj = new _DERTaggedObject({'explicit': this.explicit,
                                             'tag': pTag[this.type],
                                             'obj': v});
    };

    this.getEncodedHex = function() {
        return this.asn1Obj.getEncodedHex();
    }

    if (params !== undefined) {
        this.setByParam(params);
    }

};
YAHOO.lang.extend(KJUR.asn1.x509.GeneralName, KJUR.asn1.ASN1Object);

/**
 * GeneralNames ASN.1 structure class<br/>
 * @name KJUR.asn1.x509.GeneralNames
 * @class GeneralNames ASN.1 structure class
 * @description
 * <br/>
 * <h4>EXAMPLE AND ASN.1 SYNTAX</h4>
 * @example
 * gns = new KJUR.asn1.x509.GeneralNames([{'uri': 'http://aaa.com/'}, {'uri': 'http://bbb.com/'}]);
 *
 * GeneralNames ::= SEQUENCE SIZE (1..MAX) OF GeneralName
 */
KJUR.asn1.x509.GeneralNames = function(paramsArray) {
    KJUR.asn1.x509.GeneralNames.superclass.constructor.call(this);
    var asn1Array = null,
	_KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1;

    /**
     * set a array of {@link KJUR.asn1.x509.GeneralName} parameters<br/>
     * @name setByParamArray
     * @memberOf KJUR.asn1.x509.GeneralNames#
     * @function
     * @param {Array} paramsArray Array of {@link KJUR.asn1.x509.GeneralNames}
     * @description
     * <br/>
     * <h4>EXAMPLES</h4>
     * @example
     * gns = new KJUR.asn1.x509.GeneralNames();
     * gns.setByParamArray([{uri: 'http://aaa.com/'}, {uri: 'http://bbb.com/'}]);
     */
    this.setByParamArray = function(paramsArray) {
        for (var i = 0; i < paramsArray.length; i++) {
            var o = new _KJUR_asn1.x509.GeneralName(paramsArray[i]);
            this.asn1Array.push(o);
        }
    };

    this.getEncodedHex = function() {
        var o = new _KJUR_asn1.DERSequence({'array': this.asn1Array});
        return o.getEncodedHex();
    };

    this.asn1Array = new Array();
    if (typeof paramsArray != "undefined") {
        this.setByParamArray(paramsArray);
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.GeneralNames, KJUR.asn1.ASN1Object);

/**
 * DistributionPointName ASN.1 structure class<br/>
 * @name KJUR.asn1.x509.DistributionPointName
 * @class DistributionPointName ASN.1 structure class
 * @description
 * <pre>
 * DistributionPoint ::= SEQUENCE {
 *      distributionPoint       [0]     DistributionPointName OPTIONAL,
 *      reasons                 [1]     ReasonFlags OPTIONAL,
 *      cRLIssuer               [2]     GeneralNames OPTIONAL }
 *
 * DistributionPointName ::= CHOICE {
 *      fullName                [0]     GeneralNames,
 *      nameRelativeToCRLIssuer [1]     RelativeDistinguishedName }
 * 
 * ReasonFlags ::= BIT STRING {
 *      unused                  (0),
 *      keyCompromise           (1),
 *      cACompromise            (2),
 *      affiliationChanged      (3),
 *      superseded              (4),
 *      cessationOfOperation    (5),
 *      certificateHold         (6),
 *      privilegeWithdrawn      (7),
 *      aACompromise            (8) }
 * </pre>
 * @example
 */
KJUR.asn1.x509.DistributionPointName = function(gnOrRdn) {
    KJUR.asn1.x509.DistributionPointName.superclass.constructor.call(this);
    var asn1Obj = null,
	type = null,
	tag = null,
	asn1V = null,
	_KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERTaggedObject = _KJUR_asn1.DERTaggedObject;

    this.getEncodedHex = function() {
        if (this.type != "full")
            throw "currently type shall be 'full': " + this.type;
        this.asn1Obj = new _DERTaggedObject({'explicit': false,
                                             'tag': this.tag,
                                             'obj': this.asn1V});
        this.hTLV = this.asn1Obj.getEncodedHex();
        return this.hTLV;
    };

    if (gnOrRdn !== undefined) {
        if (_KJUR_asn1.x509.GeneralNames.prototype.isPrototypeOf(gnOrRdn)) {
            this.type = "full";
            this.tag = "a0";
            this.asn1V = gnOrRdn;
        } else {
            throw "This class supports GeneralNames only as argument";
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.DistributionPointName, KJUR.asn1.ASN1Object);

/**
 * DistributionPoint ASN.1 structure class<br/>
 * @name KJUR.asn1.x509.DistributionPoint
 * @class DistributionPoint ASN.1 structure class
 * @description
 * <pre>
 * DistributionPoint ::= SEQUENCE {
 *      distributionPoint       [0]     DistributionPointName OPTIONAL,
 *      reasons                 [1]     ReasonFlags OPTIONAL,
 *      cRLIssuer               [2]     GeneralNames OPTIONAL }
 *
 * DistributionPointName ::= CHOICE {
 *      fullName                [0]     GeneralNames,
 *      nameRelativeToCRLIssuer [1]     RelativeDistinguishedName }
 * 
 * ReasonFlags ::= BIT STRING {
 *      unused                  (0),
 *      keyCompromise           (1),
 *      cACompromise            (2),
 *      affiliationChanged      (3),
 *      superseded              (4),
 *      cessationOfOperation    (5),
 *      certificateHold         (6),
 *      privilegeWithdrawn      (7),
 *      aACompromise            (8) }
 * </pre>
 * @example
 */
KJUR.asn1.x509.DistributionPoint = function(params) {
    KJUR.asn1.x509.DistributionPoint.superclass.constructor.call(this);
    var asn1DP = null,
	_KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1;

    this.getEncodedHex = function() {
        var seq = new _KJUR_asn1.DERSequence();
        if (this.asn1DP != null) {
            var o1 = new _KJUR_asn1.DERTaggedObject({'explicit': true,
                                                     'tag': 'a0',
                                                     'obj': this.asn1DP});
            seq.appendASN1Object(o1);
        }
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (params.dpobj !== undefined) {
            this.asn1DP = params.dpobj;
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.x509.DistributionPoint, KJUR.asn1.ASN1Object);

/**
 * static object for OID
 * @name KJUR.asn1.x509.OID
 * @class static object for OID
 * @property {Assoc Array} atype2oidList for short attribute type name and oid (ex. 'C' and '2.5.4.6')
 * @property {Assoc Array} name2oidList for oid name and oid (ex. 'keyUsage' and '2.5.29.15')
 * @property {Assoc Array} objCache for caching name and DERObjectIdentifier object
 * @description
 * This class defines OID name and values.
 * AttributeType names registered in OID.atype2oidList are following:
 * <table style="border-width: thin; border-style: solid; witdh: 100%">
 * <tr><th>short</th><th>long</th><th>OID</th></tr>
 * <tr><td>CN</td>commonName<td></td><td>2.5.4.3</td></tr>
 * <tr><td>L</td><td>localityName</td><td>2.5.4.7</td></tr>
 * <tr><td>ST</td><td>stateOrProvinceName</td><td>2.5.4.8</td></tr>
 * <tr><td>O</td><td>organizationName</td><td>2.5.4.10</td></tr>
 * <tr><td>OU</td><td>organizationalUnitName</td><td>2.5.4.11</td></tr>
 * <tr><td>C</td><td></td>countryName<td>2.5.4.6</td></tr>
 * <tr><td>STREET</td>streetAddress<td></td><td>2.5.4.6</td></tr>
 * <tr><td>DC</td><td>domainComponent</td><td>0.9.2342.19200300.100.1.25</td></tr>
 * <tr><td>UID</td><td>userId</td><td>0.9.2342.19200300.100.1.1</td></tr>
 * <tr><td>SN</td><td>surname</td><td>2.5.4.4</td></tr>
 * <tr><td>DN</td><td>distinguishedName</td><td>2.5.4.49</td></tr>
 * <tr><td>E</td><td>emailAddress</td><td>1.2.840.113549.1.9.1</td></tr>
 * <tr><td></td><td>businessCategory</td><td>2.5.4.15</td></tr>
 * <tr><td></td><td>postalCode</td><td>2.5.4.17</td></tr>
 * <tr><td></td><td>jurisdictionOfIncorporationL</td><td>1.3.6.1.4.1.311.60.2.1.1</td></tr>
 * <tr><td></td><td>jurisdictionOfIncorporationSP</td><td>1.3.6.1.4.1.311.60.2.1.2</td></tr>
 * <tr><td></td><td>jurisdictionOfIncorporationC</td><td>1.3.6.1.4.1.311.60.2.1.3</td></tr>
 * </table>
 *
 * @example
 */
KJUR.asn1.x509.OID = new function(params) {
    this.atype2oidList = {
	// RFC 4514 AttributeType name string (MUST recognized)
        'CN':		'2.5.4.3',
        'L':		'2.5.4.7',
        'ST':		'2.5.4.8',
        'O':		'2.5.4.10',
        'OU':		'2.5.4.11',
        'C':		'2.5.4.6',
        'STREET':	'2.5.4.9',
        'DC':		'0.9.2342.19200300.100.1.25',
        'UID':		'0.9.2342.19200300.100.1.1',
	// other AttributeType name string
	// http://blog.livedoor.jp/k_urushima/archives/656114.html
        'SN':		'2.5.4.4', // surname
        'T':		'2.5.4.12', // title
        'DN':		'2.5.4.49', // distinguishedName
        'E':		'1.2.840.113549.1.9.1', // emailAddress in MS.NET or Bouncy
	// other AttributeType name string (no short name)
	'description':			'2.5.4.13',
	'businessCategory':		'2.5.4.15',
	'postalCode':			'2.5.4.17',
	'serialNumber':			'2.5.4.5',
	'uniqueIdentifier':		'2.5.4.45',
	'organizationIdentifier':	'2.5.4.97',
	'jurisdictionOfIncorporationL':	'1.3.6.1.4.1.311.60.2.1.1',
	'jurisdictionOfIncorporationSP':'1.3.6.1.4.1.311.60.2.1.2',
	'jurisdictionOfIncorporationC':	'1.3.6.1.4.1.311.60.2.1.3'
    };
    this.name2oidList = {
        'sha1':                 '1.3.14.3.2.26',
        'sha256':               '2.16.840.1.101.3.4.2.1',
        'sha384':               '2.16.840.1.101.3.4.2.2',
        'sha512':               '2.16.840.1.101.3.4.2.3',
        'sha224':               '2.16.840.1.101.3.4.2.4',
        'md5':                  '1.2.840.113549.2.5',
        'md2':                  '1.3.14.7.2.2.1',
        'ripemd160':            '1.3.36.3.2.1',

        'MD2withRSA':           '1.2.840.113549.1.1.2',
        'MD4withRSA':           '1.2.840.113549.1.1.3',
        'MD5withRSA':           '1.2.840.113549.1.1.4',
        'SHA1withRSA':          '1.2.840.113549.1.1.5',
        'SHA224withRSA':        '1.2.840.113549.1.1.14',
        'SHA256withRSA':        '1.2.840.113549.1.1.11',
        'SHA384withRSA':        '1.2.840.113549.1.1.12',
        'SHA512withRSA':        '1.2.840.113549.1.1.13',

        'SHA1withECDSA':        '1.2.840.10045.4.1',
        'SHA224withECDSA':      '1.2.840.10045.4.3.1',
        'SHA256withECDSA':      '1.2.840.10045.4.3.2',
        'SHA384withECDSA':      '1.2.840.10045.4.3.3',
        'SHA512withECDSA':      '1.2.840.10045.4.3.4',

        'dsa':                  '1.2.840.10040.4.1',
        'SHA1withDSA':          '1.2.840.10040.4.3',
        'SHA224withDSA':        '2.16.840.1.101.3.4.3.1',
        'SHA256withDSA':        '2.16.840.1.101.3.4.3.2',

        'rsaEncryption':        '1.2.840.113549.1.1.1',

	// X.500 AttributeType defined in RFC 4514
        'commonName':			'2.5.4.3',
        'countryName':			'2.5.4.6',
        'localityName':			'2.5.4.7',
        'stateOrProvinceName':		'2.5.4.8',
        'streetAddress':		'2.5.4.9',
        'organizationName':		'2.5.4.10',
        'organizationalUnitName':	'2.5.4.11',
        'domainComponent':		'0.9.2342.19200300.100.1.25',
        'userId':			'0.9.2342.19200300.100.1.1',
	// other AttributeType name string
	'surname':			'2.5.4.4',
        'title':			'2.5.4.12',
	'distinguishedName':		'2.5.4.49',
	'emailAddress':			'1.2.840.113549.1.9.1',
	// other AttributeType name string (no short name)
	'description':			'2.5.4.13',
	'businessCategory':		'2.5.4.15',
	'postalCode':			'2.5.4.17',
	'uniqueIdentifier':		'2.5.4.45',
	'organizationIdentifier':	'2.5.4.97',
	'jurisdictionOfIncorporationL':	'1.3.6.1.4.1.311.60.2.1.1',
	'jurisdictionOfIncorporationSP':'1.3.6.1.4.1.311.60.2.1.2',
	'jurisdictionOfIncorporationC':	'1.3.6.1.4.1.311.60.2.1.3',

        'subjectKeyIdentifier': '2.5.29.14',
        'keyUsage':             '2.5.29.15',
        'subjectAltName':       '2.5.29.17',
        'issuerAltName':        '2.5.29.18',
        'basicConstraints':     '2.5.29.19',
        'nameConstraints':      '2.5.29.30',
        'cRLDistributionPoints':'2.5.29.31',
        'certificatePolicies':  '2.5.29.32',
        'authorityKeyIdentifier':'2.5.29.35',
        'policyConstraints':    '2.5.29.36',
        'extKeyUsage':          '2.5.29.37',
        'authorityInfoAccess':  '1.3.6.1.5.5.7.1.1',
        'ocsp':                 '1.3.6.1.5.5.7.48.1',
        'caIssuers':            '1.3.6.1.5.5.7.48.2',

        'anyExtendedKeyUsage':  '2.5.29.37.0',
        'serverAuth':           '1.3.6.1.5.5.7.3.1',
        'clientAuth':           '1.3.6.1.5.5.7.3.2',
        'codeSigning':          '1.3.6.1.5.5.7.3.3',
        'emailProtection':      '1.3.6.1.5.5.7.3.4',
        'timeStamping':         '1.3.6.1.5.5.7.3.8',
        'ocspSigning':          '1.3.6.1.5.5.7.3.9',

        'ecPublicKey':          '1.2.840.10045.2.1',
        'secp256r1':            '1.2.840.10045.3.1.7',
        'secp256k1':            '1.3.132.0.10',
        'secp384r1':            '1.3.132.0.34',

        'pkcs5PBES2':           '1.2.840.113549.1.5.13',
        'pkcs5PBKDF2':          '1.2.840.113549.1.5.12',

        'des-EDE3-CBC':         '1.2.840.113549.3.7',

        'data':                 '1.2.840.113549.1.7.1', // CMS data
        'signed-data':          '1.2.840.113549.1.7.2', // CMS signed-data
        'enveloped-data':       '1.2.840.113549.1.7.3', // CMS enveloped-data
        'digested-data':        '1.2.840.113549.1.7.5', // CMS digested-data
        'encrypted-data':       '1.2.840.113549.1.7.6', // CMS encrypted-data
        'authenticated-data':   '1.2.840.113549.1.9.16.1.2', // CMS authenticated-data
        'tstinfo':              '1.2.840.113549.1.9.16.1.4', // RFC3161 TSTInfo
        'extensionRequest':     '1.2.840.113549.1.9.14',// CSR extensionRequest
    };

    this.objCache = {};

    /**
     * get DERObjectIdentifier by registered OID name
     * @name name2obj
     * @memberOf KJUR.asn1.x509.OID
     * @function
     * @param {String} name OID
     * @description
     * @example
     * var asn1ObjOID = OID.name2obj('SHA1withRSA');
     */
    this.name2obj = function(name) {
        if (typeof this.objCache[name] != "undefined")
            return this.objCache[name];
        if (typeof this.name2oidList[name] == "undefined")
            throw "Name of ObjectIdentifier not defined: " + name;
        var oid = this.name2oidList[name];
        var obj = new KJUR.asn1.DERObjectIdentifier({'oid': oid});
        this.objCache[name] = obj;
        return obj;
    };

    /**
     * get DERObjectIdentifier by registered attribute type name such like 'C' or 'CN'<br/>
     * @name atype2obj
     * @memberOf KJUR.asn1.x509.OID
     * @function
     * @param {String} atype short attribute type name such like 'C' or 'CN'
     * @description
     * @example
     * KJUR.asn1.x509.OID.atype2obj('CN') &rarr; 2.5.4.3
     * KJUR.asn1.x509.OID.atype2obj('OU') &rarr; 2.5.4.11
     */
    this.atype2obj = function(atype) {
        if (typeof this.objCache[atype] != "undefined")
            return this.objCache[atype];
        if (typeof this.atype2oidList[atype] == "undefined")
            throw "AttributeType name undefined: " + atype;
        var oid = this.atype2oidList[atype];
        var obj = new KJUR.asn1.DERObjectIdentifier({'oid': oid});
        this.objCache[atype] = obj;
        return obj;
    };
};

/**
 * convert OID to name<br/>
 * @name oid2name
 * @memberOf KJUR.asn1.x509.OID
 * @function
 * @param {String} oid dot noted Object Identifer string (ex. 1.2.3.4)
 * @return {String} OID name if registered otherwise empty string
 * @since asn1x509 1.0.9
 * @description
 * This static method converts OID string to its name.
 * If OID is undefined then it returns empty string (i.e. '').
 * @example
 * KJUR.asn1.x509.OID.oid2name("1.3.6.1.5.5.7.1.1") &rarr; 'authorityInfoAccess'
 */
KJUR.asn1.x509.OID.oid2name = function(oid) {
    var list = KJUR.asn1.x509.OID.name2oidList;
    for (var name in list) {
        if (list[name] == oid) return name;
    }
    return '';
};

/**
 * convert OID to AttributeType name<br/>
 * @name oid2atype
 * @memberOf KJUR.asn1.x509.OID
 * @function
 * @param {String} oid dot noted Object Identifer string (ex. 1.2.3.4)
 * @return {String} OID AttributeType name if registered otherwise oid
 * @since jsrsasign 6.2.2 asn1x509 1.0.18
 * @description
 * This static method converts OID string to its AttributeType name.
 * If OID is not defined in OID.atype2oidList associative array then it returns OID
 * specified as argument.
 * @example
 * KJUR.asn1.x509.OID.oid2atype("2.5.4.3") &rarr; CN
 * KJUR.asn1.x509.OID.oid2atype("1.3.6.1.4.1.311.60.2.1.3") &rarr; jurisdictionOfIncorporationC
 * KJUR.asn1.x509.OID.oid2atype("0.1.2.3.4") &rarr; 0.1.2.3.4 // unregistered OID
 */
KJUR.asn1.x509.OID.oid2atype = function(oid) {
    var list = KJUR.asn1.x509.OID.atype2oidList;
    for (var atype in list) {
        if (list[atype] == oid) return atype;
    }
    return oid;
};

/**
 * convert OID name to OID value<br/>
 * @name name2oid
 * @memberOf KJUR.asn1.x509.OID
 * @function
 * @param {String} OID name
 * @return {String} dot noted Object Identifer string (ex. 1.2.3.4)
 * @since asn1x509 1.0.11
 * @description
 * This static method converts from OID name to OID string.
 * If OID is undefined then it returns empty string (i.e. '').
 * @example
 * KJUR.asn1.x509.OID.name2oid("authorityInfoAccess") &rarr; 1.3.6.1.5.5.7.1.1
 */
KJUR.asn1.x509.OID.name2oid = function(name) {
    var list = KJUR.asn1.x509.OID.name2oidList;
    if (list[name] === undefined) return '';
    return list[name];
};

/**
 * X.509 certificate and CRL utilities class<br/>
 * @name KJUR.asn1.x509.X509Util
 * @class X.509 certificate and CRL utilities class
 */
KJUR.asn1.x509.X509Util = {};

/**
 * issue a certificate in PEM format
 * @name newCertPEM
 * @memberOf KJUR.asn1.x509.X509Util
 * @function
 * @param {Array} param parameter to issue a certificate
 * @since asn1x509 1.0.6
 * @description
 * This method can issue a certificate by a simple
 * JSON object.
 * Signature value will be provided by signing with
 * private key using 'cakey' parameter or
 * hexa decimal signature value by 'sighex' parameter.
 * <br/>
 * NOTE: Algorithm parameter of AlgorithmIdentifier will
 * be set automatically by default. (see {@link KJUR.asn1.x509.AlgorithmIdentifier})
 * from jsrsasign 7.1.1 asn1x509 1.0.20.
 *
 * @example
 * var certPEM = KJUR.asn1.x509.X509Util.newCertPEM({
 *   serial: {int: 4},
 *   sigalg: {name: 'SHA1withECDSA'},
 *   issuer: {str: '/C=US/O=a'},
 *   notbefore: {'str': '130504235959Z'},
 *   notafter: {'str': '140504235959Z'},
 *   subject: {str: '/C=US/O=b'},
 *   sbjpubkey: pubKeyObj,
 *   ext: [
 *     {basicConstraints: {cA: true, critical: true}},
 *     {keyUsage: {bin: '11'}},
 *   ],
 *   cakey: prvKeyObj
 * });
 * // -- or --
 * var certPEM = KJUR.asn1.x509.X509Util.newCertPEM({
 *   serial: {int: 4},
 *   sigalg: {name: 'SHA1withECDSA'},
 *   issuer: {str: '/C=US/O=a'},
 *   notbefore: {'str': '130504235959Z'},
 *   notafter: {'str': '140504235959Z'},
 *   subject: {str: '/C=US/O=b'},
 *   sbjpubkey: pubKeyPEM,
 *   ext: [
 *     {basicConstraints: {cA: true, critical: true}},
 *     {keyUsage: {bin: '11'}},
 *   ],
 *   cakey: [prvkey, pass]}
 * );
 * // -- or --
 * var certPEM = KJUR.asn1.x509.X509Util.newCertPEM({
 *   serial: {int: 1},
 *   sigalg: {name: 'SHA1withRSA'},
 *   issuer: {str: '/C=US/O=T1'},
 *   notbefore: {'str': '130504235959Z'},
 *   notafter: {'str': '140504235959Z'},
 *   subject: {str: '/C=US/O=T1'},
 *   sbjpubkey: pubKeyObj,
 *   sighex: '0102030405..'
 * });
 * // for the issuer and subject field, another
 * // representation is also available
 * var certPEM = KJUR.asn1.x509.X509Util.newCertPEM({
 *   serial: {int: 1},
 *   sigalg: {name: 'SHA256withRSA'},
 *   issuer: {C: "US", O: "T1"},
 *   notbefore: {'str': '130504235959Z'},
 *   notafter: {'str': '140504235959Z'},
 *   subject: {C: "US", O: "T1", CN: "http://example.com/"},
 *   sbjpubkey: pubKeyObj,
 *   sighex: '0102030405..'
 * });
 */
KJUR.asn1.x509.X509Util.newCertPEM = function(param) {
    var _KJUR_asn1_x509 = KJUR.asn1.x509,
	_TBSCertificate = _KJUR_asn1_x509.TBSCertificate,
	_Certificate = _KJUR_asn1_x509.Certificate;
    var o = new _TBSCertificate();

    if (param.serial !== undefined)
        o.setSerialNumberByParam(param.serial);
    else
        throw "serial number undefined.";

    if (typeof param.sigalg.name === 'string')
        o.setSignatureAlgByParam(param.sigalg);
    else
        throw "unproper signature algorithm name";

    if (param.issuer !== undefined)
        o.setIssuerByParam(param.issuer);
    else
        throw "issuer name undefined.";

    if (param.notbefore !== undefined)
        o.setNotBeforeByParam(param.notbefore);
    else
        throw "notbefore undefined.";

    if (param.notafter !== undefined)
        o.setNotAfterByParam(param.notafter);
    else
        throw "notafter undefined.";

    if (param.subject !== undefined)
        o.setSubjectByParam(param.subject);
    else
        throw "subject name undefined.";

    if (param.sbjpubkey !== undefined)
        o.setSubjectPublicKeyByGetKey(param.sbjpubkey);
    else
        throw "subject public key undefined.";

    if (param.ext !== undefined && param.ext.length !== undefined) {
        for (var i = 0; i < param.ext.length; i++) {
            for (key in param.ext[i]) {
                o.appendExtensionByName(key, param.ext[i][key]);
            }
        }
    }

    // set signature
    if (param.cakey === undefined && param.sighex === undefined)
        throw "param cakey and sighex undefined.";

    var caKey = null;
    var cert = null;

    if (param.cakey) {
	if (param.cakey.isPrivate === true) {
	    caKey = param.cakey;
	} else {
            caKey = KEYUTIL.getKey.apply(null, param.cakey);
	}
        cert = new _Certificate({'tbscertobj': o, 'prvkeyobj': caKey});
        cert.sign();
    }

    if (param.sighex) {
        cert = new _Certificate({'tbscertobj': o});
        cert.setSignatureHex(param.sighex);
    }

    return cert.getPEMString();
};

/* asn1cms-1.0.5.js (c) 2013-2017 Kenji Urushima | kjur.github.io/jsrsasign/license
 */
/*
 * asn1cms.js - ASN.1 DER encoder and verifier classes for Cryptographic Message Syntax(CMS)
 *
 * Copyright (c) 2013-2017 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name asn1cms-1.0.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version 1.0.5 (2017-Sep-15)
 * @since jsrsasign 4.2.4
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

/** 
 * kjur's class library name space
 * // already documented in asn1-1.0.js
 * @name KJUR
 * @namespace kjur's class library name space
 */
if (typeof KJUR == "undefined" || !KJUR) KJUR = {};

/**
 * kjur's ASN.1 class library name space
 * // already documented in asn1-1.0.js
 * @name KJUR.asn1
 * @namespace
 */
if (typeof KJUR.asn1 == "undefined" || !KJUR.asn1) KJUR.asn1 = {};

/**
 * kjur's ASN.1 class for Cryptographic Message Syntax(CMS)
 * <p>
 * This name space provides 
 * <a href="https://tools.ietf.org/html/rfc5652">RFC 5652
 * Cryptographic Message Syntax (CMS)</a> SignedData generator.
 *
 * <h4>FEATURES</h4>
 * <ul>
 * <li>easily generate CMS SignedData</li>
 * <li>easily verify CMS SignedData</li>
 * <li>APIs are very similar to BouncyCastle library ASN.1 classes. So easy to learn.</li>
 * </ul>
 * 
 * <h4>PROVIDED CLASSES</h4>
 * <ul>
 * <li>{@link KJUR.asn1.cms.SignedData}</li>
 * <li>{@link KJUR.asn1.cms.SignerInfo}</li>
 * <li>{@link KJUR.asn1.cms.AttributeList}</li>
 * <li>{@link KJUR.asn1.cms.ContentInfo}</li>
 * <li>{@link KJUR.asn1.cms.EncapsulatedContentInfo}</li>
 * <li>{@link KJUR.asn1.cms.IssuerAndSerialNumber}</li>
 * <li>{@link KJUR.asn1.cms.CMSUtil}</li>
 * <li>{@link KJUR.asn1.cms.Attribute}</li>
 * <li>{@link KJUR.asn1.cms.ContentType}</li>
 * <li>{@link KJUR.asn1.cms.MessageDigest}</li>
 * <li>{@link KJUR.asn1.cms.SigningTime}</li>
 * <li>{@link KJUR.asn1.cms.SigningCertificate}</li>
 * <li>{@link KJUR.asn1.cms.SigningCertificateV2}</li>
 * </ul>
 * NOTE: Please ignore method summary and document of this namespace. 
 * This caused by a bug of jsdoc2.
 * </p>
 * @name KJUR.asn1.cms
 * @namespace
 */
if (typeof KJUR.asn1.cms == "undefined" || !KJUR.asn1.cms) KJUR.asn1.cms = {};

/**
 * Attribute class for base of CMS attribute
 * @name KJUR.asn1.cms.Attribute
 * @class Attribute class for base of CMS attribute
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.2.4 asn1cms 1.0.0
 * @description
 * <pre>
 * Attributes ::= SET OF Attribute
 * Attribute ::= SEQUENCE {
 *    type               OBJECT IDENTIFIER,
 *    values             AttributeSetValue }
 * AttributeSetValue ::= SET OF ANY
 * </pre>
 */
KJUR.asn1.cms.Attribute = function(params) {
    var valueList = [], // array of values
	_KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1;

    _KJUR_asn1.cms.Attribute.superclass.constructor.call(this);

    this.getEncodedHex = function() {
        var attrTypeASN1, attrValueASN1, seq;
        attrTypeASN1 = new _KJUR_asn1.DERObjectIdentifier({"oid": this.attrTypeOid});

        attrValueASN1 = new _KJUR_asn1.DERSet({"array": this.valueList});
        try {
            attrValueASN1.getEncodedHex();
        } catch (ex) {
            throw "fail valueSet.getEncodedHex in Attribute(1)/" + ex;
        }

        seq = new _KJUR_asn1.DERSequence({"array": [attrTypeASN1, attrValueASN1]});
        try {
            this.hTLV = seq.getEncodedHex();
        } catch (ex) {
            throw "failed seq.getEncodedHex in Attribute(2)/" + ex;
        }

        return this.hTLV;
    };
};
YAHOO.lang.extend(KJUR.asn1.cms.Attribute, KJUR.asn1.ASN1Object);

/**
 * class for CMS ContentType attribute
 * @name KJUR.asn1.cms.ContentType
 * @class class for CMS ContentType attribute
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.cms.Attribute
 * @since jsrsasign 4.2.4 asn1cms 1.0.0
 * @description
 * <pre>
 * Attribute ::= SEQUENCE {
 *    type               OBJECT IDENTIFIER,
 *    values             AttributeSetValue }
 * AttributeSetValue ::= SET OF ANY
 * ContentType ::= OBJECT IDENTIFIER
 * </pre>
 * @example
 * o = new KJUR.asn1.cms.ContentType({name: 'data'});
 * o = new KJUR.asn1.cms.ContentType({oid: '1.2.840.113549.1.9.16.1.4'});
 */
KJUR.asn1.cms.ContentType = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1;

    _KJUR_asn1.cms.ContentType.superclass.constructor.call(this);

    this.attrTypeOid = "1.2.840.113549.1.9.3";
    var contentTypeASN1 = null;

    if (typeof params != "undefined") {
        var contentTypeASN1 = new _KJUR_asn1.DERObjectIdentifier(params);
        this.valueList = [contentTypeASN1];
    }
};
YAHOO.lang.extend(KJUR.asn1.cms.ContentType, KJUR.asn1.cms.Attribute);

/**
 * class for CMS MessageDigest attribute
 * @name KJUR.asn1.cms.MessageDigest
 * @class class for CMS MessageDigest attribute
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.cms.Attribute
 * @since jsrsasign 4.2.4 asn1cms 1.0.0
 * @description
 * <pre>
 * Attribute ::= SEQUENCE {
 *    type               OBJECT IDENTIFIER,
 *    values             AttributeSetValue }
 * AttributeSetValue ::= SET OF ANY
 * MessageDigest ::= OCTET STRING
 * </pre>
 * @example
 * o = new KJUR.asn1.cms.MessageDigest({hex: 'a1a2a3a4...'});
 */
KJUR.asn1.cms.MessageDigest = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DEROctetString = _KJUR_asn1.DEROctetString,
	_KJUR_asn1_cms = _KJUR_asn1.cms;

    _KJUR_asn1_cms.MessageDigest.superclass.constructor.call(this);
    this.attrTypeOid = "1.2.840.113549.1.9.4";

    if (params !== undefined) {
        if (params.eciObj instanceof _KJUR_asn1_cms.EncapsulatedContentInfo &&
            typeof params.hashAlg === "string") {
            var dataHex = params.eciObj.eContentValueHex;
            var hashAlg = params.hashAlg;
            var hashValueHex = _KJUR.crypto.Util.hashHex(dataHex, hashAlg);
            var dAttrValue1 = new _DEROctetString({hex: hashValueHex});
            dAttrValue1.getEncodedHex();
            this.valueList = [dAttrValue1];
        } else {
            var dAttrValue1 = new _DEROctetString(params);
            dAttrValue1.getEncodedHex();
            this.valueList = [dAttrValue1];
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.cms.MessageDigest, KJUR.asn1.cms.Attribute);

/**
 * class for CMS SigningTime attribute
 * @name KJUR.asn1.cms.SigningTime
 * @class class for CMS SigningTime attribute
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.cms.Attribute
 * @since jsrsasign 4.2.4 asn1cms 1.0.0
 * @description
 * <pre>
 * Attribute ::= SEQUENCE {
 *    type               OBJECT IDENTIFIER,
 *    values             AttributeSetValue }
 * AttributeSetValue ::= SET OF ANY
 * SigningTime  ::= Time
 * Time ::= CHOICE {
 *    utcTime UTCTime,
 *    generalTime GeneralizedTime }
 * </pre>
 * @example
 * o = new KJUR.asn1.cms.SigningTime(); // current time UTCTime by default
 * o = new KJUR.asn1.cms.SigningTime({type: 'gen'}); // current time GeneralizedTime
 * o = new KJUR.asn1.cms.SigningTime({str: '20140517093800Z'}); // specified GeneralizedTime
 * o = new KJUR.asn1.cms.SigningTime({str: '140517093800Z'}); // specified UTCTime
 */
KJUR.asn1.cms.SigningTime = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1;

    _KJUR_asn1.cms.SigningTime.superclass.constructor.call(this);
    this.attrTypeOid = "1.2.840.113549.1.9.5";

    if (params !== undefined) {
        var asn1 = new _KJUR_asn1.x509.Time(params);
        try {
            asn1.getEncodedHex();
        } catch (ex) {
            throw "SigningTime.getEncodedHex() failed/" + ex;
        }
        this.valueList = [asn1];
    }
};
YAHOO.lang.extend(KJUR.asn1.cms.SigningTime, KJUR.asn1.cms.Attribute);

/**
 * class for CMS SigningCertificate attribute
 * @name KJUR.asn1.cms.SigningCertificate
 * @class class for CMS SigningCertificate attribute
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.cms.Attribute
 * @since jsrsasign 4.5.1 asn1cms 1.0.1
 * @description
 * <pre>
 * Attribute ::= SEQUENCE {
 *    type               OBJECT IDENTIFIER,
 *    values             AttributeSetValue }
 * AttributeSetValue ::= SET OF ANY
 * SigningCertificate ::= SEQUENCE {
 *    certs SEQUENCE OF ESSCertID,
 *    policies SEQUENCE OF PolicyInformation OPTIONAL }
 * ESSCertID ::= SEQUENCE {
 *    certHash Hash,
 *    issuerSerial IssuerSerial OPTIONAL }
 * IssuerSerial ::= SEQUENCE {
 *    issuer GeneralNames,
 *    serialNumber CertificateSerialNumber }
 * </pre>
 * @example
 * o = new KJUR.asn1.cms.SigningCertificate({array: [certPEM]});
 */
KJUR.asn1.cms.SigningCertificate = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_KJUR_asn1_cms = _KJUR_asn1.cms,
	_KJUR_crypto = _KJUR.crypto;

    _KJUR_asn1_cms.SigningCertificate.superclass.constructor.call(this);
    this.attrTypeOid = "1.2.840.113549.1.9.16.2.12";

    this.setCerts = function(listPEM) {
        var list = [];
        for (var i = 0; i < listPEM.length; i++) {
            var hex = pemtohex(listPEM[i]);
            var certHashHex = _KJUR.crypto.Util.hashHex(hex, 'sha1');
            var dCertHash = 
		new _KJUR_asn1.DEROctetString({hex: certHashHex});
            dCertHash.getEncodedHex();
            var dIssuerSerial =
                new _KJUR_asn1_cms.IssuerAndSerialNumber({cert: listPEM[i]});
            dIssuerSerial.getEncodedHex();
            var dESSCertID =
                new _DERSequence({array: [dCertHash, dIssuerSerial]});
            dESSCertID.getEncodedHex();
            list.push(dESSCertID);
        }

        var dValue = new _DERSequence({array: list});
        dValue.getEncodedHex();
        this.valueList = [dValue];
    };

    if (params !== undefined) {
        if (typeof params.array == "object") {
            this.setCerts(params.array);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.cms.SigningCertificate, KJUR.asn1.cms.Attribute);

/**
 * class for CMS SigningCertificateV2 attribute
 * @name KJUR.asn1.cms.SigningCertificateV2
 * @class class for CMS SigningCertificateV2 attribute
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.cms.Attribute
 * @since jsrsasign 4.5.1 asn1cms 1.0.1
 * @description
 * <pre>
 * oid-signingCertificateV2 = 1.2.840.113549.1.9.16.2.47 
 * Attribute ::= SEQUENCE {
 *    type               OBJECT IDENTIFIER,
 *    values             AttributeSetValue }
 * AttributeSetValue ::= SET OF ANY
 * SigningCertificateV2 ::=  SEQUENCE {
 *    certs        SEQUENCE OF ESSCertIDv2,
 *    policies     SEQUENCE OF PolicyInformation OPTIONAL }
 * ESSCertIDv2 ::=  SEQUENCE {
 *    hashAlgorithm           AlgorithmIdentifier
 *                            DEFAULT {algorithm id-sha256},
 *    certHash                Hash,
 *    issuerSerial            IssuerSerial OPTIONAL }
 * Hash ::= OCTET STRING
 * IssuerSerial ::= SEQUENCE {
 *    issuer                  GeneralNames,
 *    serialNumber            CertificateSerialNumber }
 * </pre>
 * @example
 * // hash algorithm is sha256 by default:
 * o = new KJUR.asn1.cms.SigningCertificateV2({array: [certPEM]});
 * o = new KJUR.asn1.cms.SigningCertificateV2({array: [certPEM],
 *                                             hashAlg: 'sha512'});
 */
KJUR.asn1.cms.SigningCertificateV2 = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_KJUR_asn1_cms = _KJUR_asn1.cms,
	_KJUR_crypto = _KJUR.crypto;

    _KJUR_asn1_cms.SigningCertificateV2.superclass.constructor.call(this);
    this.attrTypeOid = "1.2.840.113549.1.9.16.2.47";

    this.setCerts = function(listPEM, hashAlg) {
        var list = [];
        for (var i = 0; i < listPEM.length; i++) {
            var hex = pemtohex(listPEM[i]);

            var a = [];
            if (hashAlg !== "sha256")
                a.push(new _KJUR_asn1_x509.AlgorithmIdentifier({name: hashAlg}));

            var certHashHex = _KJUR_crypto.Util.hashHex(hex, hashAlg);
            var dCertHash = new _KJUR_asn1.DEROctetString({hex: certHashHex});
            dCertHash.getEncodedHex();
            a.push(dCertHash);

            var dIssuerSerial =
                new _KJUR_asn1_cms.IssuerAndSerialNumber({cert: listPEM[i]});
            dIssuerSerial.getEncodedHex();
            a.push(dIssuerSerial);

            var dESSCertIDv2 = new _DERSequence({array: a});
            dESSCertIDv2.getEncodedHex();
            list.push(dESSCertIDv2);
        }

        var dValue = new _DERSequence({array: list});
        dValue.getEncodedHex();
        this.valueList = [dValue];
    };

    if (params !== undefined) {
        if (typeof params.array == "object") {
            var hashAlg = "sha256"; // sha2 default
            if (typeof params.hashAlg == "string") 
                hashAlg = params.hashAlg;
            this.setCerts(params.array, hashAlg);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.cms.SigningCertificateV2, KJUR.asn1.cms.Attribute);

/**
 * class for IssuerAndSerialNumber ASN.1 structure for CMS
 * @name KJUR.asn1.cms.IssuerAndSerialNumber
 * @class class for CMS IssuerAndSerialNumber ASN.1 structure for CMS
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.2.4 asn1cms 1.0.0
 * @description
 * <pre>
 * IssuerAndSerialNumber ::= SEQUENCE {
 *    issuer Name,
 *    serialNumber CertificateSerialNumber }
 * CertificateSerialNumber ::= INTEGER
 * </pre>
 * @example
 * // specify by X500Name and DERInteger
 * o = new KJUR.asn1.cms.IssuerAndSerialNumber(
 *      {issuer: {str: '/C=US/O=T1'}, serial {int: 3}});
 * // specify by PEM certificate
 * o = new KJUR.asn1.cms.IssuerAndSerialNumber({cert: certPEM});
 * o = new KJUR.asn1.cms.IssuerAndSerialNumber(certPEM); // since 1.0.3
 */
KJUR.asn1.cms.IssuerAndSerialNumber = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERInteger = _KJUR_asn1.DERInteger,
	_KJUR_asn1_cms = _KJUR_asn1.cms,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_X500Name = _KJUR_asn1_x509.X500Name,
	_X509 = X509;

    _KJUR_asn1_cms.IssuerAndSerialNumber.superclass.constructor.call(this);
    var dIssuer = null;
    var dSerial = null;

    /*
     * @since asn1cms 1.0.1
     */
    this.setByCertPEM = function(certPEM) {
        var certHex = pemtohex(certPEM);
        var x = new _X509();
        x.hex = certHex;
        var issuerTLVHex = x.getIssuerHex();
        this.dIssuer = new _X500Name();
        this.dIssuer.hTLV = issuerTLVHex;
        var serialVHex = x.getSerialNumberHex();
        this.dSerial = new _DERInteger({hex: serialVHex});
    };

    this.getEncodedHex = function() {
        var seq = new _KJUR_asn1.DERSequence({"array": [this.dIssuer,
							this.dSerial]});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (typeof params == "string" &&
            params.indexOf("-----BEGIN ") != -1) {
            this.setByCertPEM(params);
        }
        if (params.issuer && params.serial) {
            if (params.issuer instanceof _X500Name) {
                this.dIssuer = params.issuer;
            } else {
                this.dIssuer = new _X500Name(params.issuer);
            }
            if (params.serial instanceof _DERInteger) {
                this.dSerial = params.serial;
            } else {
                this.dSerial = new _DERInteger(params.serial);
            }
        }
        if (typeof params.cert == "string") {
            this.setByCertPEM(params.cert);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.cms.IssuerAndSerialNumber, KJUR.asn1.ASN1Object);

/**
 * class for Attributes ASN.1 structure for CMS
 * @name KJUR.asn1.cms.AttributeList
 * @class class for Attributes ASN.1 structure for CMS
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.2.4 asn1cms 1.0.0
 * @description
 * <pre>
 * Attributes ::= SET OF Attribute
 * Attribute ::= SEQUENCE {
 *    type               OBJECT IDENTIFIER,
 *    values             AttributeSetValue }
 * </pre>
 * @example
 * // specify by X500Name and DERInteger
 * o = new KJUR.asn1.cms.AttributeList({sorted: false}); // ASN.1 BER unsorted SET OF
 * o = new KJUR.asn1.cms.AttributeList();  // ASN.1 DER sorted by default
 * o.clear();                              // clear list of Attributes
 * n = o.length();                         // get number of Attribute
 * o.add(new KJUR.asn1.cms.SigningTime()); // add SigningTime attribute
 * hex = o.getEncodedHex();                // get hex encoded ASN.1 data
 */
KJUR.asn1.cms.AttributeList = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_KJUR_asn1_cms = _KJUR_asn1.cms;

    _KJUR_asn1_cms.AttributeList.superclass.constructor.call(this);
    this.list = new Array();
    this.sortFlag = true;

    this.add = function(item) {
        if (item instanceof _KJUR_asn1_cms.Attribute) {
            this.list.push(item);
        }
    };

    this.length = function() {
        return this.list.length;
    };

    this.clear = function() {
        this.list = new Array();
        this.hTLV = null;
        this.hV = null;
    };

    this.getEncodedHex = function() {
        if (typeof this.hTLV == "string") return this.hTLV;
        var set = new _KJUR_asn1.DERSet({array: this.list, 
                                         sortflag: this.sortFlag});
        this.hTLV = set.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (typeof params.sortflag != "undefined" &&
            params.sortflag == false)
            this.sortFlag = false;
    }
};
YAHOO.lang.extend(KJUR.asn1.cms.AttributeList, KJUR.asn1.ASN1Object);

/**
 * class for SignerInfo ASN.1 structure of CMS SignedData
 * @name KJUR.asn1.cms.SignerInfo
 * @class class for Attributes ASN.1 structure of CMS SigndData
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.2.4 asn1cms 1.0.0
 * @description
 * <pre>
 * SignerInfo ::= SEQUENCE {
 *    version CMSVersion,
 *    sid SignerIdentifier,
 *    digestAlgorithm DigestAlgorithmIdentifier,
 *    signedAttrs [0] IMPLICIT SignedAttributes OPTIONAL,
 *    signatureAlgorithm SignatureAlgorithmIdentifier,
 *    signature SignatureValue,
 *    unsignedAttrs [1] IMPLICIT UnsignedAttributes OPTIONAL }
 * </pre>
 * @example
 * o = new KJUR.asn1.cms.SignerInfo();
 * o.setSignerIdentifier(certPEMstring);
 * o.dSignedAttrs.add(new KJUR.asn1.cms.ContentType({name: 'data'}));
 * o.dSignedAttrs.add(new KJUR.asn1.cms.MessageDigest({hex: 'a1b2...'}));
 * o.dSignedAttrs.add(new KJUR.asn1.cms.SigningTime());
 * o.sign(privteKeyParam, "SHA1withRSA");
 */
KJUR.asn1.cms.SignerInfo = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERTaggedObject = _KJUR_asn1.DERTaggedObject,
	_KJUR_asn1_cms = _KJUR_asn1.cms,
	_AttributeList = _KJUR_asn1_cms.AttributeList,
	_ContentType = _KJUR_asn1_cms.ContentType,
	_EncapsulatedContentInfo = _KJUR_asn1_cms.EncapsulatedContentInfo,
	_MessageDigest = _KJUR_asn1_cms.MessageDigest,
	_SignedData = _KJUR_asn1_cms.SignedData,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_AlgorithmIdentifier = _KJUR_asn1_x509.AlgorithmIdentifier,
	_KJUR_crypto = _KJUR.crypto,
	_KEYUTIL = KEYUTIL;

    _KJUR_asn1_cms.SignerInfo.superclass.constructor.call(this);

    this.dCMSVersion = new _KJUR_asn1.DERInteger({'int': 1});
    this.dSignerIdentifier = null;
    this.dDigestAlgorithm = null;
    this.dSignedAttrs = new _AttributeList();
    this.dSigAlg = null;
    this.dSig = null;
    this.dUnsignedAttrs = new _AttributeList();

    this.setSignerIdentifier = function(params) {
        if (typeof params == "string" &&
            params.indexOf("CERTIFICATE") != -1 &&
            params.indexOf("BEGIN") != -1 &&
            params.indexOf("END") != -1) {

            var certPEM = params;
            this.dSignerIdentifier = 
                new _KJUR_asn1_cms.IssuerAndSerialNumber({cert: params});
        }
    };

    /**
     * set ContentType/MessageDigest/DigestAlgorithms for SignerInfo/SignedData
     * @name setForContentAndHash
     * @memberOf KJUR.asn1.cms.SignerInfo
     * @param {Array} params JSON parameter to set content related field
     * @description
     * This method will specify following fields by a parameters:
     * <ul>
     * <li>add ContentType signed attribute by encapContentInfo</li>
     * <li>add MessageDigest signed attribute by encapContentInfo and hashAlg</li>
     * <li>add a hash algorithm used in MessageDigest to digestAlgorithms field of SignedData</li>
     * <li>set a hash algorithm used in MessageDigest to digestAlgorithm field of SignerInfo</li>
     * </ul>
     * Argument 'params' is an associative array having following elements:
     * <ul>
     * <li>eciObj - {@link KJUR.asn1.cms.EncapsulatedContentInfo} object</li>
     * <li>sdObj - {@link KJUR.asn1.cms.SignedData} object (Option) to set DigestAlgorithms</li>
     * <li>hashAlg - string of hash algorithm name which is used for MessageDigest attribute</li>
     * </ul>
     * some of elements can be omited.
     * @example
     * sd = new KJUR.asn1.cms.SignedData();
     * signerInfo.setForContentAndHash({sdObj: sd,
     *                                  eciObj: sd.dEncapContentInfo,
     *                                  hashAlg: 'sha256'});
     */
    this.setForContentAndHash = function(params) {
        if (params !== undefined) {
            if (params.eciObj instanceof _EncapsulatedContentInfo) {
                this.dSignedAttrs.add(new _ContentType({oid: '1.2.840.113549.1.7.1'}));
                this.dSignedAttrs.add(new _MessageDigest({eciObj: params.eciObj,
                                                          hashAlg: params.hashAlg}));
            }
            if (params.sdObj !== undefined &&
                params.sdObj instanceof _SignedData) {
                if (params.sdObj.digestAlgNameList.join(":").indexOf(params.hashAlg) == -1) {
                    params.sdObj.digestAlgNameList.push(params.hashAlg);
                }
            }
            if (typeof params.hashAlg == "string") {
                this.dDigestAlgorithm = new _AlgorithmIdentifier({name: params.hashAlg});
            }
        }
    };

    this.sign = function(keyParam, sigAlg) {
        // set algorithm
        this.dSigAlg = new _AlgorithmIdentifier({name: sigAlg});

        // set signature
        var data = this.dSignedAttrs.getEncodedHex();
        var prvKey = _KEYUTIL.getKey(keyParam);
        var sig = new _KJUR_crypto.Signature({alg: sigAlg});
        sig.init(prvKey);
        sig.updateHex(data);
        var sigValHex = sig.sign();
        this.dSig = new _KJUR_asn1.DEROctetString({hex: sigValHex});
    };

    /*
     * @since asn1cms 1.0.3
     */
    this.addUnsigned = function(attr) {
        this.hTLV = null;
        this.dUnsignedAttrs.hTLV = null;
        this.dUnsignedAttrs.add(attr);
    };

    this.getEncodedHex = function() {
        //alert("sattrs.hTLV=" + this.dSignedAttrs.hTLV);
        if (this.dSignedAttrs instanceof _AttributeList &&
            this.dSignedAttrs.length() == 0) {
            throw "SignedAttrs length = 0 (empty)";
        }
        var sa = new _DERTaggedObject({obj: this.dSignedAttrs,
                                       tag: 'a0', explicit: false});
        var ua = null;;
        if (this.dUnsignedAttrs.length() > 0) {
            ua = new _DERTaggedObject({obj: this.dUnsignedAttrs,
                                       tag: 'a1', explicit: false});
        }

        var items = [
            this.dCMSVersion,
            this.dSignerIdentifier,
            this.dDigestAlgorithm,
            sa,
            this.dSigAlg,
            this.dSig,
        ];
        if (ua != null) items.push(ua);

        var seq = new _KJUR_asn1.DERSequence({array: items});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };
};
YAHOO.lang.extend(KJUR.asn1.cms.SignerInfo, KJUR.asn1.ASN1Object);

/**
 * class for EncapsulatedContentInfo ASN.1 structure for CMS
 * @name KJUR.asn1.cms.EncapsulatedContentInfo
 * @class class for EncapsulatedContentInfo ASN.1 structure for CMS
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.2.4 asn1cms 1.0.0
 * @description
 * <pre>
 * EncapsulatedContentInfo ::= SEQUENCE {
 *    eContentType ContentType,
 *    eContent [0] EXPLICIT OCTET STRING OPTIONAL }
 * ContentType ::= OBJECT IDENTIFIER
 * </pre>
 * @example
 * o = new KJUR.asn1.cms.EncapsulatedContentInfo();
 * o.setContentType('1.2.3.4.5');     // specify eContentType by OID
 * o.setContentType('data');          // specify eContentType by name
 * o.setContentValueHex('a1a2a4...'); // specify eContent data by hex string
 * o.setContentValueStr('apple');     // specify eContent data by UTF-8 string
 * // for detached contents (i.e. data not concluded in eContent)
 * o.isDetached = true;               // false as default 
 */
KJUR.asn1.cms.EncapsulatedContentInfo = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERTaggedObject = _KJUR_asn1.DERTaggedObject,
	_DERSequence = _KJUR_asn1.DERSequence,
	_DERObjectIdentifier = _KJUR_asn1.DERObjectIdentifier,
	_DEROctetString = _KJUR_asn1.DEROctetString,
	_KJUR_asn1_cms = _KJUR_asn1.cms;

    _KJUR_asn1_cms.EncapsulatedContentInfo.superclass.constructor.call(this);

    this.dEContentType = new _DERObjectIdentifier({name: 'data'});
    this.dEContent = null;
    this.isDetached = false;
    this.eContentValueHex = null;
    
    this.setContentType = function(nameOrOid) {
        if (nameOrOid.match(/^[0-2][.][0-9.]+$/)) {
            this.dEContentType = new _DERObjectIdentifier({oid: nameOrOid});
        } else {
            this.dEContentType = new _DERObjectIdentifier({name: nameOrOid});
        }
    };

    this.setContentValue = function(params) {
        if (params !== undefined) {
            if (typeof params.hex == "string") {
                this.eContentValueHex = params.hex;
            } else if (typeof params.str == "string") {
                this.eContentValueHex = utf8tohex(params.str);
            }
        }
    };

    this.setContentValueHex = function(valueHex) {
        this.eContentValueHex = valueHex;
    };

    this.setContentValueStr = function(valueStr) {
        this.eContentValueHex = utf8tohex(valueStr);
    };

    this.getEncodedHex = function() {
        if (typeof this.eContentValueHex != "string") {
            throw "eContentValue not yet set";
        }

        var dValue = new _DEROctetString({hex: this.eContentValueHex});
        this.dEContent = new _DERTaggedObject({obj: dValue,
                                               tag: 'a0',
                                               explicit: true});

        var a = [this.dEContentType];
        if (! this.isDetached) a.push(this.dEContent);
        var seq = new _DERSequence({array: a});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };
};
YAHOO.lang.extend(KJUR.asn1.cms.EncapsulatedContentInfo, KJUR.asn1.ASN1Object);

// - type
// - obj
/**
 * class for ContentInfo ASN.1 structure for CMS
 * @name KJUR.asn1.cms.ContentInfo
 * @class class for ContentInfo ASN.1 structure for CMS
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.2.4 asn1cms 1.0.0
 * @description
 * <pre>
 * ContentInfo ::= SEQUENCE {
 *    contentType ContentType,
 *    content [0] EXPLICIT ANY DEFINED BY contentType }
 * ContentType ::= OBJECT IDENTIFIER
 * </pre>
 * @example
 * a = [new KJUR.asn1.DERInteger({int: 1}),
 *      new KJUR.asn1.DERInteger({int: 2})];
 * seq = new KJUR.asn1.DERSequence({array: a});
 * o = new KJUR.asn1.cms.ContentInfo({type: 'data', obj: seq});
 */
KJUR.asn1.cms.ContentInfo = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERTaggedObject = _KJUR_asn1.DERTaggedObject,
	_DERSequence = _KJUR_asn1.DERSequence,
	_KJUR_asn1_x509 = _KJUR_asn1.x509;

    KJUR.asn1.cms.ContentInfo.superclass.constructor.call(this);

    this.dContentType = null;
    this.dContent = null;

    this.setContentType = function(params) {
        if (typeof params == "string") {
            this.dContentType = _KJUR_asn1_x509.OID.name2obj(params);
        }
    };

    this.getEncodedHex = function() {
        var dContent0 = new _DERTaggedObject({obj:      this.dContent,
					      tag:      'a0',
					      explicit: true});
        var seq = new _DERSequence({array: [this.dContentType, dContent0]});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (params.type) 
	    this.setContentType(params.type);
        if (params.obj && 
	    params.obj instanceof _KJUR_asn1.ASN1Object)
	    this.dContent = params.obj;
    }
};
YAHOO.lang.extend(KJUR.asn1.cms.ContentInfo, KJUR.asn1.ASN1Object);

/**
 * class for SignerInfo ASN.1 structure of CMS SignedData
 * @name KJUR.asn1.cms.SignedData
 * @class class for Attributes ASN.1 structure of CMS SigndData
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.2.4 asn1cms 1.0.0
 *
 * @description
 * <pre>
 * SignedData ::= SEQUENCE {
 *    version CMSVersion,
 *    digestAlgorithms DigestAlgorithmIdentifiers,
 *    encapContentInfo EncapsulatedContentInfo,
 *    certificates [0] IMPLICIT CertificateSet OPTIONAL,
 *    crls [1] IMPLICIT RevocationInfoChoices OPTIONAL,
 *    signerInfos SignerInfos }
 * SignerInfos ::= SET OF SignerInfo
 * CertificateSet ::= SET OF CertificateChoices
 * DigestAlgorithmIdentifiers ::= SET OF DigestAlgorithmIdentifier
 * CertificateSet ::= SET OF CertificateChoices
 * RevocationInfoChoices ::= SET OF RevocationInfoChoice
 * </pre>
 *
 * @example
 * sd = new KJUR.asn1.cms.SignedData();
 * sd.dEncapContentInfo.setContentValueStr("test string");
 * sd.signerInfoList[0].setForContentAndHash({sdObj: sd,
 *                                            eciObj: sd.dEncapContentInfo,
 *                                            hashAlg: 'sha256'});
 * sd.signerInfoList[0].dSignedAttrs.add(new KJUR.asn1.cms.SigningTime());
 * sd.signerInfoList[0].setSignerIdentifier(certPEM);
 * sd.signerInfoList[0].sign(prvP8PEM, "SHA256withRSA");
 * hex = sd.getContentInfoEncodedHex();
 */
KJUR.asn1.cms.SignedData = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_ASN1Object = _KJUR_asn1.ASN1Object,
	_DERInteger = _KJUR_asn1.DERInteger,
	_DERSet = _KJUR_asn1.DERSet,
	_DERSequence = _KJUR_asn1.DERSequence,
	_DERTaggedObject = _KJUR_asn1.DERTaggedObject,
	_KJUR_asn1_cms = _KJUR_asn1.cms,
	_EncapsulatedContentInfo = _KJUR_asn1_cms.EncapsulatedContentInfo,
	_SignerInfo = _KJUR_asn1_cms.SignerInfo,
	_ContentInfo = _KJUR_asn1_cms.ContentInfo,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_AlgorithmIdentifier = _KJUR_asn1_x509.AlgorithmIdentifier;

    KJUR.asn1.cms.SignedData.superclass.constructor.call(this);

    this.dCMSVersion = new _DERInteger({'int': 1});
    this.dDigestAlgs = null;
    this.digestAlgNameList = [];
    this.dEncapContentInfo = new _EncapsulatedContentInfo();
    this.dCerts = null;
    this.certificateList = [];
    this.crlList = [];
    this.signerInfoList = [new _SignerInfo()];

    this.addCertificatesByPEM = function(certPEM) {
        var hex = pemtohex(certPEM);
        var o = new _ASN1Object();
        o.hTLV = hex;
        this.certificateList.push(o);
    };

    this.getEncodedHex = function() {
        if (typeof this.hTLV == "string") return this.hTLV;
        
        if (this.dDigestAlgs == null) {
            var digestAlgList = [];
            for (var i = 0; i < this.digestAlgNameList.length; i++) {
                var name = this.digestAlgNameList[i];
                var o = new _AlgorithmIdentifier({name: name});
                digestAlgList.push(o);
            }
            this.dDigestAlgs = new _DERSet({array: digestAlgList});
        }

        var a = [this.dCMSVersion,
                 this.dDigestAlgs,
                 this.dEncapContentInfo];

        if (this.dCerts == null) {
            if (this.certificateList.length > 0) {
                var o1 = new _DERSet({array: this.certificateList});
                this.dCerts
                    = new _DERTaggedObject({obj:      o1,
                                            tag:      'a0',
                                            explicit: false});
            }
        }
        if (this.dCerts != null) a.push(this.dCerts);
        
        var dSignerInfos = new _DERSet({array: this.signerInfoList});
        a.push(dSignerInfos);

        var seq = new _DERSequence({array: a});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    this.getContentInfo = function() {
        this.getEncodedHex();
        var ci = new _ContentInfo({type: 'signed-data', obj: this});
        return ci;
    };

    this.getContentInfoEncodedHex = function() {
        var ci = this.getContentInfo();
        var ciHex = ci.getEncodedHex();
        return ciHex;
    };

    this.getPEM = function() {
        return hextopem(this.getContentInfoEncodedHex(), "CMS");
    };
};
YAHOO.lang.extend(KJUR.asn1.cms.SignedData, KJUR.asn1.ASN1Object);

/**
 * CMS utiliteis class
 * @name KJUR.asn1.cms.CMSUtil
 * @class CMS utilities class
 */
KJUR.asn1.cms.CMSUtil = new function() {
};

/**
 * generate SignedData object specified by JSON parameters
 * @name newSignedData
 * @memberOf KJUR.asn1.cms.CMSUtil
 * @function
 * @param {Array} param JSON parameter to generate CMS SignedData
 * @return {KJUR.asn1.cms.SignedData} object just generated
 * @description
 * This method provides more easy way to genereate
 * CMS SignedData ASN.1 structure by JSON data.
 * @example
 * var sd = KJUR.asn1.cms.CMSUtil.newSignedData({
 *   content: {str: "jsrsasign"},
 *   certs: [certPEM],
 *   signerInfos: [{
 *     hashAlg: 'sha256',
 *     sAttr: {
 *       SigningTime: {}
 *       SigningCertificateV2: {array: [certPEM]},
 *     },
 *     signerCert: certPEM,
 *     sigAlg: 'SHA256withRSA',
 *     signerPrvKey: prvPEM
 *   }]
 * });
 */
KJUR.asn1.cms.CMSUtil.newSignedData = function(param) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_KJUR_asn1_cms = _KJUR_asn1.cms,
	_SignerInfo = _KJUR_asn1_cms.SignerInfo,
	_SignedData = _KJUR_asn1_cms.SignedData,
	_SigningTime = _KJUR_asn1_cms.SigningTime,
	_SigningCertificate = _KJUR_asn1_cms.SigningCertificate,
	_SigningCertificateV2 = _KJUR_asn1_cms.SigningCertificateV2,
	_KJUR_asn1_cades = _KJUR_asn1.cades,
	_SignaturePolicyIdentifier = _KJUR_asn1_cades.SignaturePolicyIdentifier;

    var sd = new _SignedData();

    sd.dEncapContentInfo.setContentValue(param.content);

    if (typeof param.certs == "object") {
        for (var i = 0; i < param.certs.length; i++) {
            sd.addCertificatesByPEM(param.certs[i]);
        }
    }
    
    sd.signerInfoList = [];
    for (var i = 0; i < param.signerInfos.length; i++) {
        var siParam = param.signerInfos[i];
        var si = new _SignerInfo();
        si.setSignerIdentifier(siParam.signerCert);

        si.setForContentAndHash({sdObj:   sd,
                                 eciObj:  sd.dEncapContentInfo,
                                 hashAlg: siParam.hashAlg});

        for (attrName in siParam.sAttr) {
            var attrParam = siParam.sAttr[attrName];
            if (attrName == "SigningTime") {
                var attr = new _SigningTime(attrParam);
                si.dSignedAttrs.add(attr);
            }
            if (attrName == "SigningCertificate") {
                var attr = new _SigningCertificate(attrParam);
                si.dSignedAttrs.add(attr);
            }
            if (attrName == "SigningCertificateV2") {
                var attr = new _SigningCertificateV2(attrParam);
                si.dSignedAttrs.add(attr);
            }
            if (attrName == "SignaturePolicyIdentifier") {
                var attr = new _SignaturePolicyIdentifier(attrParam);
                si.dSignedAttrs.add(attr);
            }
        }

        si.sign(siParam.signerPrvKey, siParam.sigAlg);
        sd.signerInfoList.push(si);
    }

    return sd;
};

/**
 * verify SignedData specified by JSON parameters
 *
 * @name verifySignedData
 * @memberOf KJUR.asn1.cms.CMSUtil
 * @function
 * @param {Array} param JSON parameter to verify CMS SignedData
 * @return {Object} JSON data as the result of validation
 * @since jsrsasign 8.0.4 asn1cms 1.0.5
 * @description
 * This method provides validation for CMS SignedData.
 * Following parameters can be applied:
 * <ul>
 * <li>cms - hexadecimal data of DER CMS SignedData (aka. PKCS#7 or p7s)</li>
 *     to verify (OPTION)</li>
 * </ul>
 * @example
 * KJUR.asn1.cms.CMSUtil.verifySignedData({ cms: "3082058a..." }) 
 * &rarr;
 * {
 *   isValid: true,
 *   parse: ... // parsed data
 *   signerInfos: [
 *     {
 *     }
 *   ]
 * }
 */
KJUR.asn1.cms.CMSUtil.verifySignedData = function(param) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_KJUR_asn1_cms = _KJUR_asn1.cms,
	_SignerInfo = _KJUR_asn1_cms.SignerInfo,
	_SignedData = _KJUR_asn1_cms.SignedData,
	_SigningTime = _KJUR_asn1_cms.SigningTime,
	_SigningCertificate = _KJUR_asn1_cms.SigningCertificate,
	_SigningCertificateV2 = _KJUR_asn1_cms.SigningCertificateV2,
	_KJUR_asn1_cades = _KJUR_asn1.cades,
	_SignaturePolicyIdentifier = _KJUR_asn1_cades.SignaturePolicyIdentifier,
	_isHex = _KJUR.lang.String.isHex,
	_ASN1HEX = ASN1HEX,
	_getVbyList = _ASN1HEX.getVbyList,
	_getTLVbyList = _ASN1HEX.getTLVbyList,
	_getIdxbyList = _ASN1HEX.getIdxbyList,
	_getChildIdx = _ASN1HEX.getChildIdx,
	_getTLV = _ASN1HEX.getTLV,
	_oidname = _ASN1HEX.oidname,
	_hashHex = _KJUR.crypto.Util.hashHex;

    if (param.cms === undefined &&
        ! _isHex(param.cms)) {
    }

    var hCMS = param.cms;

    var _findSignerInfos = function(hCMS, result) {
	var idx;
	for (var i = 3; i < 6; i++) {
	    idx = _getIdxbyList(hCMS, 0, [1, 0, i]);
	    if (idx !== undefined) {
		var tag = hCMS.substr(idx, 2);
		if (tag === "a0") result.certsIdx = idx;
		if (tag === "a1") result.revinfosIdx = idx;
		if (tag === "31") result.signerinfosIdx = idx;
	    }
	}
    };

    var _parseSignerInfos = function(hCMS, result) {
	var idxSignerInfos = result.signerinfosIdx;
	if (idxSignerInfos === undefined) return;
	var idxList = _getChildIdx(hCMS, idxSignerInfos);
	result.signerInfoIdxList = idxList;
	for (var i = 0; i < idxList.length; i++) {
	    var idxSI = idxList[i];
	    var info = { idx: idxSI };
	    _parseSignerInfo(hCMS, info);
	    result.signerInfos.push(info);
	};
    };

    var _parseSignerInfo = function(hCMS, info) {
	var idx = info.idx;

	// 1. signer identifier
	info.signerid_issuer1 = _getTLVbyList(hCMS, idx, [1, 0], "30");
	info.signerid_serial1 = _getVbyList(hCMS, idx, [1, 1], "02");

	// 2. hash alg
	info.hashalg = _oidname(_getVbyList(hCMS, idx, [2, 0], "06"));

	// 3. [0] singedAtttrs
	var idxSignedAttrs = _getIdxbyList(hCMS, idx, [3], "a0");
	info.idxSignedAttrs = idxSignedAttrs;
	_parseSignedAttrs(hCMS, info, idxSignedAttrs);

	var aIdx = _getChildIdx(hCMS, idx);
	var n = aIdx.length;
	if (n < 6) throw "malformed SignerInfo";
	
	info.sigalg = _oidname(_getVbyList(hCMS, idx, [n - 2, 0], "06"));
	info.sigval = _getVbyList(hCMS, idx, [n - 1], "04");
	//info.sigval = _getVbyList(hCMS, 0, [1, 0, 4, 0, 5], "04");
	//info.sigval = hCMS;
    };

    var _parseSignedAttrs = function(hCMS, info, idx) {
	var aIdx = _getChildIdx(hCMS, idx);
	info.signedAttrIdxList = aIdx;
	for (var i = 0; i < aIdx.length; i++) {
	    var idxAttr = aIdx[i];
	    var hAttrType = _getVbyList(hCMS, idxAttr, [0], "06");
	    var v;

	    if (hAttrType === "2a864886f70d010905") { // siging time
		v = hextoutf8(_getVbyList(hCMS, idxAttr, [1, 0]));
		info.saSigningTime = v;
	    } else if (hAttrType === "2a864886f70d010904") { // message digest
		v = _getVbyList(hCMS, idxAttr, [1, 0], "04");
		info.saMessageDigest = v;
	    }
	}
    };

    var _parseSignedData = function(hCMS, result) {
	// check if signedData (1.2.840.113549.1.7.2) type
	if (_getVbyList(hCMS, 0, [0], "06") !== "2a864886f70d010702") {
	    return result;
	}
	result.cmsType = "signedData";

	// find eContent data
	result.econtent = _getVbyList(hCMS, 0, [1, 0, 2, 1, 0]);

	// find certificates,revInfos,signerInfos index
	_findSignerInfos(hCMS, result);

	result.signerInfos = [];
	_parseSignerInfos(hCMS, result);
    };

    var _verify = function(hCMS, result) {
	var aSI = result.parse.signerInfos;
	var n = aSI.length;
	var isValid = true;
	for (var i = 0; i < n; i++) {
	    var si = aSI[i];
	    _verifySignerInfo(hCMS, result, si, i);
	    if (! si.isValid)
		isValid = false;
	}
	result.isValid = isValid;
    };

    /*
     * _findCert
     * 
     * @param hCMS {String} hexadecimal string of CMS signed data
     * @param result {Object} JSON object of validation result
     * @param si {Object} JSON object of signerInfo in the result above
     * @param idx {Number} index of signerInfo???
     */
    var _findCert = function(hCMS, result, si, idx) {
	var certsIdx = result.parse.certsIdx;
	var aCert;

	if (result.certs === undefined) {
	    aCert = [];
	    result.certkeys = [];
	    var aIdx = _getChildIdx(hCMS, certsIdx);
	    for (var i = 0; i < aIdx.length; i++) {
		var hCert = _getTLV(hCMS, aIdx[i]);
		var x = new X509();
		x.readCertHex(hCert);
		aCert[i] = x;
		result.certkeys[i] = x.getPublicKey();
	    }
	    result.certs = aCert;
	} else {
	    aCert = result.certs;
	}

	result.cccc = aCert.length;
	result.cccci = aIdx.length;

	for (var i = 0; i < aCert.length; i++) {
	    var issuer2 = x.getIssuerHex();
	    var serial2 = x.getSerialNumberHex();
	    if (si.signerid_issuer1 === issuer2 &&
		si.signerid_serial1 === serial2) {
		si.certkey_idx = i;
	    }
	}
    };

    var _verifySignerInfo = function(hCMS, result, si, idx) {
	si.verifyDetail = {};

	var _detail = si.verifyDetail;

	var econtent = result.parse.econtent;

	// verify MessageDigest signed attribute
	var hashalg = si.hashalg;
	var saMessageDigest = si.saMessageDigest;
	
	// verify messageDigest
	_detail.validMessageDigest = false;
	//_detail._econtent = econtent;
	//_detail._hashalg = hashalg;
	//_detail._saMD = saMessageDigest;
	if (_hashHex(econtent, hashalg) === saMessageDigest)
	    _detail.validMessageDigest = true;

	// find signing certificate
	_findCert(hCMS, result, si, idx);
	//if (si.signerid_cert === undefined)
	//    throw Error("can't find signer certificate");

	// verify signature value
	_detail.validSignatureValue = false;
	var sigalg = si.sigalg;
	var hSignedAttr = "31" + _getTLV(hCMS, si.idxSignedAttrs).substr(2);
	si.signedattrshex = hSignedAttr;
	var pubkey = result.certs[si.certkey_idx].getPublicKey();
	var sig = new KJUR.crypto.Signature({alg: sigalg});
	sig.init(pubkey);
	sig.updateHex(hSignedAttr);
	var isValid = sig.verify(si.sigval);
	_detail.validSignatureValue_isValid = isValid;
	if (isValid === true)
	    _detail.validSignatureValue = true;

	// verify SignerInfo totally
	si.isValid =false;
	if (_detail.validMessageDigest &&
	    _detail.validSignatureValue) {
	    si.isValid = true;
	}
    };

    var _findSignerCert = function() {
    };

    var result = { isValid: false, parse: {} };
    _parseSignedData(hCMS, result.parse);

    _verify(hCMS, result);
    
    return result;
};


/* asn1tsp-1.0.3.js (c) 2014-2017 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * asn1tsp.js - ASN.1 DER encoder classes for RFC 3161 Time Stamp Protocol
 *
 * Copyright (c) 2014-2017 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name asn1tsp-1.0.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version jsrsasign 7.2.1 asn1tsp 1.0.3 (2017-Jun-03)
 * @since jsrsasign 4.5.1
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

/* 
 * kjur's class library name space
 * // already documented in asn1-1.0.js
 * @name KJUR
 * @namespace kjur's class library name space
 */
if (typeof KJUR == "undefined" || !KJUR) KJUR = {};

/*
 * kjur's ASN.1 class library name space
 * // already documented in asn1-1.0.js
 * @name KJUR.asn1
 * @namespace
 */
if (typeof KJUR.asn1 == "undefined" || !KJUR.asn1) KJUR.asn1 = {};

/**
 * kjur's ASN.1 class for RFC 3161 Time Stamp Protocol
 * <p>
 * This name space provides 
 * <a href="https://tools.ietf.org/html/rfc3161">RFC 3161
 * Time-Stamp Protocol(TSP)</a> data generator.
 *
 * <h4>FEATURES</h4>
 * <ul>
 * <li>easily generate CMS SignedData</li>
 * <li>APIs are very similar to BouncyCastle library ASN.1 classes. So easy to learn.</li>
 * </ul>
 * 
 * <h4>PROVIDED CLASSES</h4>
 * <ul>
 * </ul>
 * NOTE: Please ignore method summary and document of this namespace. This caused by a bug of jsdoc2.
 * </p>
 * @name KJUR.asn1.tsp
 * @namespace
 */
if (typeof KJUR.asn1.tsp == "undefined" || !KJUR.asn1.tsp) KJUR.asn1.tsp = {};

/**
 * class for TSP Accuracy ASN.1 object
 * @name KJUR.asn1.tsp.Accuracy
 * @class class for TSP Accuracy ASN.1 object
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.6.0 asn1tsp 1.0.0
 * @description
 * <pre>
 * Accuracy ::= SEQUENCE {
 *       seconds        INTEGER              OPTIONAL,
 *       millis     [0] INTEGER  (1..999)    OPTIONAL,
 *       micros     [1] INTEGER  (1..999)    OPTIONAL  }
 * </pre>
 * @example
 * o = new KJUR.asn1.tsp.Accuracy({seconds: 1,
 *                                 millis: 500,
 *                                 micros: 500});
 */
KJUR.asn1.tsp.Accuracy = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERInteger = _KJUR_asn1.DERInteger,
	_DERSequence = _KJUR_asn1.DERSequence,
	_DERTaggedObject = _KJUR_asn1.DERTaggedObject;

    _KJUR_asn1.tsp.Accuracy.superclass.constructor.call(this);

    this.seconds = null;
    this.millis = null;
    this.micros = null;

    this.getEncodedHex = function() {
        var dSeconds = null;
        var dTagMillis = null;
        var dTagMicros = null;
        
        var a = [];
        if (this.seconds != null) {
            dSeconds = new _DERInteger({'int': this.seconds});
            a.push(dSeconds);
        }
        if (this.millis != null) {
            var dMillis = new _DERInteger({'int': this.millis});
            dTagMillis = new _DERTaggedObject({obj: dMillis,
                                               tag: '80',
                                               explicit: false});
            a.push(dTagMillis);
        }
        if (this.micros != null) {
            var dMicros = new _DERInteger({'int': this.micros});
            dTagMicros = new _DERTaggedObject({obj: dMicros,
                                               tag: '81',
                                               explicit: false});
            a.push(dTagMicros);
        }
        var seq = new _DERSequence({array: a});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (typeof params.seconds == "number") this.seconds = params.seconds;
        if (typeof params.millis == "number") this.millis = params.millis;
        if (typeof params.micros == "number") this.micros = params.micros;
    }
};
YAHOO.lang.extend(KJUR.asn1.tsp.Accuracy, KJUR.asn1.ASN1Object);

/**
 * class for TSP MessageImprint ASN.1 object
 * @name KJUR.asn1.tsp.MessageImprint
 * @class class for TSP MessageImprint ASN.1 object
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.6.0 asn1tsp 1.0.0
 * @description
 * <pre>
 * MessageImprint ::= SEQUENCE  {
 *      hashAlgorithm                AlgorithmIdentifier,
 *      hashedMessage                OCTET STRING  }
 * </pre>
 * @example
 * o = new KJUR.asn1.tsp.MessageImprint({hashAlg: 'sha1',
 *                                       hashValue: '1f3dea...'});
 */
KJUR.asn1.tsp.MessageImprint = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_DEROctetString = _KJUR_asn1.DEROctetString,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_AlgorithmIdentifier = _KJUR_asn1_x509.AlgorithmIdentifier;

    _KJUR_asn1.tsp.MessageImprint.superclass.constructor.call(this);

    this.dHashAlg = null;
    this.dHashValue = null;

    this.getEncodedHex = function() {
        if (typeof this.hTLV == "string") return this.hTLV;
        var seq = 
            new _DERSequence({array: [this.dHashAlg, this.dHashValue]});
        return seq.getEncodedHex();
    };

    if (params !== undefined) {
        if (typeof params.hashAlg == "string") {
            this.dHashAlg = new _AlgorithmIdentifier({name: params.hashAlg});
        } 
        if (typeof params.hashValue == "string") {
            this.dHashValue = new _DEROctetString({hex: params.hashValue});
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.tsp.MessageImprint, KJUR.asn1.ASN1Object);

/**
 * class for TSP TimeStampReq ASN.1 object
 * @name KJUR.asn1.tsp.TimeStampReq
 * @class class for TSP TimeStampReq ASN.1 object
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.6.0 asn1tsp 1.0.0
 * @description
 * <pre>
 * TimeStampReq ::= SEQUENCE  {
 *    version          INTEGER  { v1(1) },
 *    messageImprint   MessageImprint,
 *    reqPolicy        TSAPolicyId               OPTIONAL,
 *    nonce            INTEGER                   OPTIONAL,
 *    certReq          BOOLEAN                   DEFAULT FALSE,
 *    extensions       [0] IMPLICIT Extensions   OPTIONAL  }
 * </pre>
 */
KJUR.asn1.tsp.TimeStampReq = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_DERInteger = _KJUR_asn1.DERInteger,
	_DERBoolean = _KJUR_asn1.DERBoolean,
	_DERObjectIdentifier = _KJUR_asn1.DERObjectIdentifier,
	_KJUR_asn1_tsp = _KJUR_asn1.tsp,
	_MessageImprint = _KJUR_asn1_tsp.MessageImprint;

    _KJUR_asn1_tsp.TimeStampReq.superclass.constructor.call(this);

    this.dVersion = new _DERInteger({'int': 1});
    this.dMessageImprint = null;
    this.dPolicy = null;
    this.dNonce = null;
    this.certReq = true;

    this.setMessageImprint = function(params) {
        if (params instanceof _MessageImprint) {
            this.dMessageImprint = params;
            return;
        }
        if (typeof params == "object") {
            this.dMessageImprint = new _MessageImprint(params);
        }
    };

    this.getEncodedHex = function() {
        if (this.dMessageImprint == null)
            throw "messageImprint shall be specified";

        var a = [this.dVersion, this.dMessageImprint];
        if (this.dPolicy != null) a.push(this.dPolicy);
        if (this.dNonce != null)  a.push(this.dNonce);
        if (this.certReq)         a.push(new _DERBoolean());

        var seq = new _DERSequence({array: a});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (typeof params.mi == "object") {
            this.setMessageImprint(params.mi);
        }
        if (typeof params.policy == "object") {
            this.dPolicy = new _DERObjectIdentifier(params.policy);
        }
        if (typeof params.nonce == "object") {
            this.dNonce = new _DERInteger(params.nonce);
        }
        if (typeof params.certreq == "boolean") {
            this.certReq = params.certreq;
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.tsp.TimeStampReq, KJUR.asn1.ASN1Object);

/**
 * class for TSP TSTInfo ASN.1 object
 * @name KJUR.asn1.tsp.TSTInfo
 * @class class for TSP TSTInfo ASN.1 object
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.6.0 asn1tsp 1.0.0
 * @description
 * <pre>
 * TSTInfo ::= SEQUENCE  {
 *    version         INTEGER  { v1(1) },
 *    policy          TSAPolicyId,
 *    messageImprint  MessageImprint,
 *    serialNumber    INTEGER, -- up to 160bit
 *    genTime         GeneralizedTime,
 *    accuracy        Accuracy                 OPTIONAL,
 *    ordering        BOOLEAN                  DEFAULT FALSE,
 *    nonce           INTEGER                  OPTIONAL,
 *    tsa             [0] GeneralName          OPTIONAL,
 *    extensions      [1] IMPLICIT Extensions  OPTIONAL   }
 * </pre>
 * @example
 * o = new KJUR.asn1.tsp.TSTInfo({
 *     policy:    '1.2.3.4.5',
 *     messageImprint: {hashAlg: 'sha256', hashMsgHex: '1abc...'},
 *     genTime:   {withMillis: true},     // OPTION
 *     accuracy:  {micros: 500},          // OPTION
 *     ordering:  true,                   // OPITON
 *     nonce:     {hex: '52fab1...'},     // OPTION
 *     tsa:       {str: '/C=US/O=TSA1'}   // OPITON
 * });
 */
KJUR.asn1.tsp.TSTInfo = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_DERInteger = _KJUR_asn1.DERInteger,
	_DERBoolean = _KJUR_asn1.DERBoolean,
	_DERGeneralizedTime = _KJUR_asn1.DERGeneralizedTime,
	_DERObjectIdentifier = _KJUR_asn1.DERObjectIdentifier,
	_KJUR_asn1_tsp = _KJUR_asn1.tsp,
	_MessageImprint = _KJUR_asn1_tsp.MessageImprint,
	_Accuracy = _KJUR_asn1_tsp.Accuracy,
        _X500Name = _KJUR_asn1.x509.X500Name;

    _KJUR_asn1_tsp.TSTInfo.superclass.constructor.call(this);

    this.dVersion = new _DERInteger({'int': 1});
    this.dPolicy = null;
    this.dMessageImprint = null;
    this.dSerialNumber = null;
    this.dGenTime = null;
    this.dAccuracy = null;
    this.dOrdering = null;
    this.dNonce = null;
    this.dTsa = null;

    this.getEncodedHex = function() {
        var a = [this.dVersion];

        if (this.dPolicy == null) throw "policy shall be specified.";
        a.push(this.dPolicy);

        if (this.dMessageImprint == null)
            throw "messageImprint shall be specified.";
        a.push(this.dMessageImprint);

        if (this.dSerialNumber == null)
            throw "serialNumber shall be specified.";
        a.push(this.dSerialNumber);

        if (this.dGenTime == null)
            throw "genTime shall be specified.";
        a.push(this.dGenTime);

        if (this.dAccuracy != null) a.push(this.dAccuracy);
        if (this.dOrdering != null) a.push(this.dOrdering);
        if (this.dNonce != null) a.push(this.dNonce);
        if (this.dTsa != null) a.push(this.dTsa);

        var seq = new _DERSequence({array: a});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (typeof params.policy == "string") {
            if (! params.policy.match(/^[0-9.]+$/))
                throw "policy shall be oid like 0.1.4.134";
            this.dPolicy = new _DERObjectIdentifier({oid: params.policy});
        }
        if (params.messageImprint !== undefined) {
            this.dMessageImprint = new _MessageImprint(params.messageImprint);
        }
        if (params.serialNumber !== undefined) {
            this.dSerialNumber = new _DERInteger(params.serialNumber);
        }
        if (params.genTime !== undefined) {
            this.dGenTime = new _DERGeneralizedTime(params.genTime);
        }
        if (params.accuracy !== undefined) {
            this.dAccuracy = new _Accuracy(params.accuracy);
        }
        if (params.ordering !== undefined &&
            params.ordering == true) {
            this.dOrdering = new _DERBoolean();
        }
        if (params.nonce !== undefined) {
            this.dNonce = new _DERInteger(params.nonce);
        }
        if (params.tsa !== undefined) {
            this.dTsa = new _X500Name(params.tsa);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.tsp.TSTInfo, KJUR.asn1.ASN1Object);

/**
 * class for TSP TimeStampResp ASN.1 object
 * @name KJUR.asn1.tsp.TimeStampResp
 * @class class for TSP TimeStampResp ASN.1 object
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.6.0 asn1tsp 1.0.0
 * @description
 * <pre>
 * TimeStampResp ::= SEQUENCE  {
 *    status                  PKIStatusInfo,
 *    timeStampToken          TimeStampToken     OPTIONAL  }
 * </pre>
 */
KJUR.asn1.tsp.TimeStampResp = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_ASN1Object = _KJUR_asn1.ASN1Object,
	_KJUR_asn1_tsp = _KJUR_asn1.tsp,
	_PKIStatusInfo = _KJUR_asn1_tsp.PKIStatusInfo;

    _KJUR_asn1_tsp.TimeStampResp.superclass.constructor.call(this);

    this.dStatus = null;
    this.dTST = null;

    this.getEncodedHex = function() {
        if (this.dStatus == null)
            throw "status shall be specified";
        var a = [this.dStatus];
        if (this.dTST != null) a.push(this.dTST);
        var seq = new _DERSequence({array: a});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (typeof params.status == "object") {
            this.dStatus = new _PKIStatusInfo(params.status);
        }
        if (params.tst !== undefined &&
            params.tst instanceof _ASN1Object) {
            this.dTST = params.tst.getContentInfo();
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.tsp.TimeStampResp, KJUR.asn1.ASN1Object);

// --- BEGIN OF RFC 2510 CMP -----------------------------------------------

/**
 * class for TSP PKIStatusInfo ASN.1 object
 * @name KJUR.asn1.tsp.PKIStatusInfo
 * @class class for TSP PKIStatusInfo ASN.1 object
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.6.0 asn1tsp 1.0.0
 * @description
 * <pre>
 * PKIStatusInfo ::= SEQUENCE {
 *    status                  PKIStatus,
 *    statusString            PKIFreeText     OPTIONAL,
 *    failInfo                PKIFailureInfo  OPTIONAL  }
 * </pre>
 */
KJUR.asn1.tsp.PKIStatusInfo = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_KJUR_asn1_tsp = _KJUR_asn1.tsp,
	_PKIStatus = _KJUR_asn1_tsp.PKIStatus,
	_PKIFreeText = _KJUR_asn1_tsp.PKIFreeText,
	_PKIFailureInfo = _KJUR_asn1_tsp.PKIFailureInfo;

    _KJUR_asn1_tsp.PKIStatusInfo.superclass.constructor.call(this);

    this.dStatus = null;
    this.dStatusString = null;
    this.dFailureInfo = null;

    this.getEncodedHex = function() {
        if (this.dStatus == null)
            throw "status shall be specified";
        var a = [this.dStatus];
        if (this.dStatusString != null) a.push(this.dStatusString);
        if (this.dFailureInfo != null) a.push(this.dFailureInfo);
        var seq = new _DERSequence({array: a});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (typeof params.status == "object") { // param for int
            this.dStatus = new _PKIStatus(params.status);
        }
        if (typeof params.statstr == "object") { // array of str
            this.dStatusString = 
                new _PKIFreeText({array: params.statstr});
        }
        if (typeof params.failinfo == "object") {
            this.dFailureInfo = 
                new _PKIFailureInfo(params.failinfo); // param for bitstr
        }
    };
};
YAHOO.lang.extend(KJUR.asn1.tsp.PKIStatusInfo, KJUR.asn1.ASN1Object);

/**
 * class for TSP PKIStatus ASN.1 object
 * @name KJUR.asn1.tsp.PKIStatus
 * @class class for TSP PKIStatus ASN.1 object
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.6.0 asn1tsp 1.0.0
 * @description
 * <pre>
 * PKIStatus ::= INTEGER {
 *    granted                (0),
 *    grantedWithMods        (1),
 *    rejection              (2),
 *    waiting                (3),
 *    revocationWarning      (4),
 *    revocationNotification (5) }
 * </pre>
 */
KJUR.asn1.tsp.PKIStatus = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERInteger = _KJUR_asn1.DERInteger,
	_KJUR_asn1_tsp = _KJUR_asn1.tsp,
	_PKIStatus = _KJUR_asn1_tsp.PKIStatus;

    _KJUR_asn1_tsp.PKIStatus.superclass.constructor.call(this);

    var dStatus = null;

    this.getEncodedHex = function() {
        this.hTLV = this.dStatus.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (params.name !== undefined) {
            var list = _PKIStatus.valueList;
            if (list[params.name] === undefined)
                throw "name undefined: " + params.name;
            this.dStatus = 
                new _DERInteger({'int': list[params.name]});
        } else {
            this.dStatus = new _DERInteger(params);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.tsp.PKIStatus, KJUR.asn1.ASN1Object);

KJUR.asn1.tsp.PKIStatus.valueList = {
    granted:                0,
    grantedWithMods:        1,
    rejection:              2,
    waiting:                3,
    revocationWarning:      4,
    revocationNotification: 5
};

/**
 * class for TSP PKIFreeText ASN.1 object
 * @name KJUR.asn1.tsp.PKIFreeText
 * @class class for TSP PKIFreeText ASN.1 object
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.6.0 asn1tsp 1.0.0
 * @description
 * <pre>
 * PKIFreeText ::= SEQUENCE {
 *    SIZE (1..MAX) OF UTF8String }
 * </pre>
 */
KJUR.asn1.tsp.PKIFreeText = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_DERUTF8String = _KJUR_asn1.DERUTF8String,
	_KJUR_asn1_tsp = _KJUR_asn1.tsp;

    _KJUR_asn1_tsp.PKIFreeText.superclass.constructor.call(this);

    this.textList = [];

    this.getEncodedHex = function() {
        var a = [];
        for (var i = 0; i < this.textList.length; i++) {
            a.push(new _DERUTF8String({str: this.textList[i]}));
        }
        var seq = new _DERSequence({array: a});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (typeof params.array == "object") {
            this.textList = params.array;
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.tsp.PKIFreeText, KJUR.asn1.ASN1Object);

/**
 * class for TSP PKIFailureInfo ASN.1 object
 * @name KJUR.asn1.tsp.PKIFailureInfo
 * @class class for TSP PKIFailureInfo ASN.1 object
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.6.0 asn1tsp 1.0.0
 * @description
 * <pre>
 * PKIFailureInfo ::= BIT STRING {
 *    badAlg                 (0),
 *    badRequest             (2),
 *    badDataFormat          (5),
 *    timeNotAvailable       (14),
 *    unacceptedPolicy       (15),
 *    unacceptedExtension    (16),
 *    addInfoNotAvailable    (17),
 *    systemFailure          (25) }
 * </pre>
 */
KJUR.asn1.tsp.PKIFailureInfo = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERBitString = _KJUR_asn1.DERBitString,
	_KJUR_asn1_tsp = _KJUR_asn1.tsp,
	_PKIFailureInfo = _KJUR_asn1_tsp.PKIFailureInfo;

    _PKIFailureInfo.superclass.constructor.call(this);

    this.value = null;

    this.getEncodedHex = function() {
        if (this.value == null)
            throw "value shall be specified";
        var binValue = new Number(this.value).toString(2);
        var dValue = new _DERBitString();
        dValue.setByBinaryString(binValue);
        this.hTLV = dValue.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (typeof params.name == "string") {
            var list = _PKIFailureInfo.valueList;
            if (list[params.name] === undefined)
                throw "name undefined: " + params.name;
            this.value = list[params.name];
        } else if (typeof params['int'] == "number") {
            this.value = params['int'];
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.tsp.PKIFailureInfo, KJUR.asn1.ASN1Object);

KJUR.asn1.tsp.PKIFailureInfo.valueList = {
    badAlg:                 0,
    badRequest:             2,
    badDataFormat:          5,
    timeNotAvailable:       14,
    unacceptedPolicy:       15,
    unacceptedExtension:    16,
    addInfoNotAvailable:    17,
    systemFailure:          25
};

// --- END OF RFC 2510 CMP -------------------------------------------

/**
 * abstract class for TimeStampToken generator
 * @name KJUR.asn1.tsp.AbstractTSAAdapter
 * @class abstract class for TimeStampToken generator
 * @param {Array} params associative array of parameters
 * @since jsrsasign 4.7.0 asn1tsp 1.0.1
 * @description
 */
KJUR.asn1.tsp.AbstractTSAAdapter = function(params) {
    this.getTSTHex = function(msgHex, hashAlg) {
        throw "not implemented yet";
    };
};

/**
 * class for simple TimeStampToken generator
 * @name KJUR.asn1.tsp.SimpleTSAAdapter
 * @class class for simple TimeStampToken generator
 * @param {Array} params associative array of parameters
 * @since jsrsasign 4.7.0 asn1tsp 1.0.1
 * @description
 */
KJUR.asn1.tsp.SimpleTSAAdapter = function(initParams) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_KJUR_asn1_tsp = _KJUR_asn1.tsp,
	_hashHex = _KJUR.crypto.Util.hashHex;

    _KJUR_asn1_tsp.SimpleTSAAdapter.superclass.constructor.call(this);
    this.params = null;
    this.serial = 0;

    this.getTSTHex = function(msgHex, hashAlg) {
        // messageImprint
        var hashHex = _hashHex(msgHex, hashAlg);
        this.params.tstInfo.messageImprint =
            {hashAlg: hashAlg, hashValue: hashHex};

        // serial
        this.params.tstInfo.serialNumber = {'int': this.serial++};

        // nonce
        var nonceValue = Math.floor(Math.random() * 1000000000);
        this.params.tstInfo.nonce = {'int': nonceValue};

        var obj = 
            _KJUR_asn1_tsp.TSPUtil.newTimeStampToken(this.params);
        return obj.getContentInfoEncodedHex();
    };

    if (initParams !== undefined) {
        this.params = initParams;
    }
};
YAHOO.lang.extend(KJUR.asn1.tsp.SimpleTSAAdapter,
                  KJUR.asn1.tsp.AbstractTSAAdapter);

/**
 * class for fixed TimeStampToken generator
 * @name KJUR.asn1.tsp.FixedTSAAdapter
 * @class class for fixed TimeStampToken generator
 * @param {Array} params associative array of parameters
 * @since jsrsasign 4.7.0 asn1tsp 1.0.1
 * @description
 * This class generates fixed TimeStampToken except messageImprint
 * for testing purpose.
 * General TSA generates TimeStampToken which varies following
 * fields:
 * <ul>
 * <li>genTime</li>
 * <li>serialNumber</li>
 * <li>nonce</li>
 * </ul>
 * Those values are provided by initial parameters.
 */
KJUR.asn1.tsp.FixedTSAAdapter = function(initParams) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_KJUR_asn1_tsp = _KJUR_asn1.tsp,
	_hashHex = _KJUR.crypto.Util.hashHex; //o

    _KJUR_asn1_tsp.FixedTSAAdapter.superclass.constructor.call(this);
    this.params = null;

    this.getTSTHex = function(msgHex, hashAlg) {
        // fixed serialNumber
        // fixed nonce        
        var hashHex = _hashHex(msgHex, hashAlg);
        this.params.tstInfo.messageImprint =
            {hashAlg: hashAlg, hashValue: hashHex};
        var obj = 
            _KJUR_asn1_tsp.TSPUtil.newTimeStampToken(this.params);
        return obj.getContentInfoEncodedHex();
    };

    if (initParams !== undefined) {
        this.params = initParams;
    }
};
YAHOO.lang.extend(KJUR.asn1.tsp.FixedTSAAdapter,
                  KJUR.asn1.tsp.AbstractTSAAdapter);

// --- TSP utilities -------------------------------------------------

/**
 * TSP utiliteis class
 * @name KJUR.asn1.tsp.TSPUtil
 * @class TSP utilities class
 */
KJUR.asn1.tsp.TSPUtil = new function() {
};
/**
 * generate TimeStampToken ASN.1 object specified by JSON parameters
 * @name newTimeStampToken
 * @memberOf KJUR.asn1.tsp.TSPUtil
 * @function
 * @param {Array} param JSON parameter to generate TimeStampToken
 * @return {KJUR.asn1.cms.SignedData} object just generated
 * @description
 * @example
 */
KJUR.asn1.tsp.TSPUtil.newTimeStampToken = function(param) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_KJUR_asn1_cms = _KJUR_asn1.cms,
	_KJUR_asn1_tsp = _KJUR_asn1.tsp,
	_TSTInfo = _KJUR_asn1.tsp.TSTInfo;

    var sd = new _KJUR_asn1_cms.SignedData();

    var dTSTInfo = new _TSTInfo(param.tstInfo);
    var tstInfoHex = dTSTInfo.getEncodedHex();
    sd.dEncapContentInfo.setContentValue({hex: tstInfoHex});
    sd.dEncapContentInfo.setContentType('tstinfo');

    if (typeof param.certs == "object") {
        for (var i = 0; i < param.certs.length; i++) {
            sd.addCertificatesByPEM(param.certs[i]);
        }
    }

    var si = sd.signerInfoList[0];
    si.setSignerIdentifier(param.signerCert);
    si.setForContentAndHash({sdObj: sd,
                             eciObj: sd.dEncapContentInfo,
                             hashAlg: param.hashAlg});
    var signingCertificate = 
        new _KJUR_asn1_cms.SigningCertificate({array: [param.signerCert]});
    si.dSignedAttrs.add(signingCertificate);

    si.sign(param.signerPrvKey, param.sigAlg);

    return sd;
};

/**
 * parse hexadecimal string of TimeStampReq
 * @name parseTimeStampReq
 * @memberOf KJUR.asn1.tsp.TSPUtil
 * @function
 * @param {String} hexadecimal string of TimeStampReq
 * @return {Array} JSON object of parsed parameters
 * @description
 * This method parses a hexadecimal string of TimeStampReq
 * and returns parsed their fields:
 * @example
 * var json = KJUR.asn1.tsp.TSPUtil.parseTimeStampReq("302602...");
 * // resulted DUMP of above 'json':
 * {mi: {hashAlg: 'sha256',          // MessageImprint hashAlg
 *       hashValue: 'a1a2a3a4...'},  // MessageImprint hashValue
 *  policy: '1.2.3.4.5',             // tsaPolicy (OPTION)
 *  nonce: '9abcf318...',            // nonce (OPTION)
 *  certreq: true}                   // certReq (OPTION)
 */
KJUR.asn1.tsp.TSPUtil.parseTimeStampReq = function(reqHex) {
    var _ASN1HEX = ASN1HEX;
    var _getChildIdx = _ASN1HEX.getChildIdx;
    var _getV = _ASN1HEX.getV;
    var _getTLV = _ASN1HEX.getTLV;
    var json = {};
    json.certreq = false;

    var idxList = _getChildIdx(reqHex, 0);

    if (idxList.length < 2)
        throw "TimeStampReq must have at least 2 items";

    var miHex = _getTLV(reqHex, idxList[1]);
    json.mi = KJUR.asn1.tsp.TSPUtil.parseMessageImprint(miHex); 

    for (var i = 2; i < idxList.length; i++) {
        var idx = idxList[i];
        var tag = reqHex.substr(idx, 2);
        if (tag == "06") { // case OID
            var policyHex = _getV(reqHex, idx);
            json.policy = _ASN1HEX.hextooidstr(policyHex);
        }
        if (tag == "02") { // case INTEGER
            json.nonce = _getV(reqHex, idx);
        }
        if (tag == "01") { // case BOOLEAN
            json.certreq = true;
        }
    }

    return json;
};

/**
 * parse hexadecimal string of MessageImprint
 * @name parseMessageImprint
 * @memberOf KJUR.asn1.tsp.TSPUtil
 * @function
 * @param {String} hexadecimal string of MessageImprint
 * @return {Array} JSON object of parsed parameters
 * @description
 * This method parses a hexadecimal string of MessageImprint
 * and returns parsed their fields:
 * @example
 * var json = KJUR.asn1.tsp.TSPUtil.parseMessageImprint("302602...");
 * // resulted DUMP of above 'json':
 * {hashAlg: 'sha256',          // MessageImprint hashAlg
 *  hashValue: 'a1a2a3a4...'}   // MessageImprint hashValue
 */
KJUR.asn1.tsp.TSPUtil.parseMessageImprint = function(miHex) {
    var _ASN1HEX = ASN1HEX;
    var _getChildIdx = _ASN1HEX.getChildIdx;
    var _getV = _ASN1HEX.getV;
    var _getIdxbyList = _ASN1HEX.getIdxbyList;
    var json = {};

    if (miHex.substr(0, 2) != "30")
        throw "head of messageImprint hex shall be '30'";

    var idxList = _getChildIdx(miHex, 0);
    var hashAlgOidIdx = _getIdxbyList(miHex, 0, [0, 0]);
    var hashAlgHex = _getV(miHex, hashAlgOidIdx);
    var hashAlgOid = _ASN1HEX.hextooidstr(hashAlgHex);
    var hashAlgName = KJUR.asn1.x509.OID.oid2name(hashAlgOid);
    if (hashAlgName == '')
        throw "hashAlg name undefined: " + hashAlgOid;
    var hashAlg = hashAlgName;
    var hashValueIdx = _getIdxbyList(miHex, 0, [1]);

    json.hashAlg = hashAlg;
    json.hashValue = _getV(miHex, hashValueIdx); 

    return json;
};

/* asn1cades-1.0.3.js (c) 2014-2017 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * asn1cades.js - ASN.1 DER encoder classes for RFC 5126 CAdES long term signature
 *
 * Copyright (c) 2014-2017 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name asn1cades-1.0.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version jsrsasign 7.2.1 asn1cades 1.0.3 (2017-Jun-03)
 * @since jsrsasign 4.7.0
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

/** 
 * kjur's class library name space
 * // already documented in asn1-1.0.js
 * @name KJUR
 * @namespace kjur's class library name space
 */
if (typeof KJUR == "undefined" || !KJUR) KJUR = {};

/**
 * kjur's ASN.1 class library name space
 * // already documented in asn1-1.0.js
 * @name KJUR.asn1
 * @namespace
 */
if (typeof KJUR.asn1 == "undefined" || !KJUR.asn1) KJUR.asn1 = {};

/**
 * kjur's ASN.1 class for RFC 5126 CAdES long term signature
 * <p>
 * This name space provides 
 * <a href="https://tools.ietf.org/html/rfc5126">RFC 5126
 * CAdES(CMS Advanced Electronic Signature)</a> generator.
 *
 * <h4>SUPPORTED FORMATS</h4>
 * Following CAdES formats is supported by this library.
 * <ul>
 * <li>CAdES-BES - CAdES Basic Electronic Signature</li>
 * <li>CAdES-EPES - CAdES Explicit Policy-based Electronic Signature</li>
 * <li>CAdES-T - Electronic Signature with Time</li>
 * </ul>
 * </p>
 *
 * <h4>PROVIDED ATTRIBUTE CLASSES</h4>
 * <ul>
 * <li>{@link KJUR.asn1.cades.SignaturePolicyIdentifier} - for CAdES-EPES</li>
 * <li>{@link KJUR.asn1.cades.SignatureTimeStamp} - for CAdES-T</li>
 * <li>{@link KJUR.asn1.cades.CompleteCertificateRefs} - for CAdES-C(for future use)</li>
 * </ul>
 * NOTE: Currntly CAdES-C is not supported since parser can't
 * handle unsigned attribute.
 * 
 * <h4>OTHER CLASSES</h4>
 * <ul>
 * <li>{@link KJUR.asn1.cades.OtherHashAlgAndValue}</li>
 * <li>{@link KJUR.asn1.cades.OtherHash}</li>
 * <li>{@link KJUR.asn1.cades.OtherCertID}</li>
 * <li>{@link KJUR.asn1.cades.CAdESUtil} - utilities for CAdES</li>
 * </ul>
 *
 * <h4>GENERATE CAdES-BES</h4>
 * To generate CAdES-BES, {@link KJUR.asn.cades} namespace 
 * classes are not required and already {@link KJUR.asn.cms} namespace 
 * provides attributes for CAdES-BES.
 * Create {@link KJUR.asn1.cms.SignedData} with following
 * mandatory attribute in CAdES-BES:
 * <ul>
 * <li>{@link KJUR.asn1.cms.ContentType}</li>
 * <li>{@link KJUR.asn1.cms.MessageDigest}</li>
 * <li>{@link KJUR.asn1.cms.SigningCertificate} or </li>
 * <li>{@link KJUR.asn1.cms.SigningCertificateV2}</li>
 * </ul>
 * CMSUtil.newSignedData method is very useful to generate CAdES-BES.
 * <pre>
 * sd = KJUR.asn1.cms.CMSUtil.newSignedData({
 *   content: {str: "aaa"},
 *   certs: [certPEM],
 *   signerInfos: [{
 *     hashAlg: 'sha256',
 *     sAttr: {SigningCertificateV2: {array: [certPEM]}},
 *     signerCert: certPEM,
 *     sigAlg: 'SHA256withRSA',
 *     signerPrvKey: pkcs8PrvKeyPEM
 *   }]
 * });
 * signedDataHex = sd.getContentInfoEncodedHex();
 * </pre>
 * NOTE: ContentType and MessageDigest signed attributes
 * are automatically added by default.
 *
 * <h4>GENERATE CAdES-BES with multiple signers</h4>
 * If you need signature by multiple signers, you can 
 * specify one or more items in 'signerInfos' property as below.
 * <pre>
 * sd = KJUR.asn1.cms.CMSUtil.newSignedData({
 *   content: {str: "aaa"},
 *   certs: [certPEM1, certPEM2],
 *   signerInfos: [{
 *     hashAlg: 'sha256',
 *     sAttr: {SigningCertificateV2: {array: [certPEM1]}},
 *     signerCert: certPEM1,
 *     sigAlg: 'SHA256withRSA',
 *     signerPrvKey: pkcs8PrvKeyPEM1
 *   },{
 *     hashAlg: 'sha1',
 *     sAttr: {SigningCertificateV2: {array: [certPEM2]}},
 *     signerCert: certPEM2,
 *     sigAlg: 'SHA1withRSA',
 *     signerPrvKey: pkcs8PrvKeyPEM2
 *   }]
 * });
 * signedDataHex = sd.getContentInfoEncodedHex();
 * </pre>
 *
 * <h4>GENERATE CAdES-EPES</h4>
 * When you need a CAdES-EPES signature,
 * you just need to add 'SignaturePolicyIdentifier'
 * attribute as below.
 * <pre>
 * sd = KJUR.asn1.cms.CMSUtil.newSignedData({
 *   content: {str: "aaa"},
 *   certs: [certPEM],
 *   signerInfos: [{
 *     hashAlg: 'sha256',
 *     sAttr: {
 *       SigningCertificateV2: {array: [certPEM]},
 *       SignaturePolicyIdentifier: {
 *         oid: '1.2.3.4.5',
 *         hash: {alg: 'sha1', hash: 'b1b2b3b4b...'}
 *       },
 *     },
 *     signerCert: certPEM,
 *     sigAlg: 'SHA256withRSA',
 *     signerPrvKey: pkcs8PrvKeyPEM
 *   }]
 * });
 * signedDataHex = sd.getContentInfoEncodedHex();
 * </pre>
 *
 * <h4>GENERATE CAdES-T</h4>
 * After a signed CAdES-BES or CAdES-EPES signature have been generated,
 * you can generate CAdES-T by adding SigningTimeStamp unsigned attribute.
 * <pre>
 * beshex = "30..."; // hex of CAdES-BES or EPES data 
 * info = KJUR.asn1.cades.CAdESUtil.parseSignedDataForAddingUnsigned(beshex);
 * // You can refer a hexadecimal string of signature value 
 * // in the first signerInfo in the CAdES-BES/EPES with a variable:
 * // 'info.si[0].sigval'. You need to get RFC 3161 TimeStampToken
 * // from a trusted time stamp authority. Otherwise you can also 
 * // get it by 'KJUR.asn1.tsp' module. We suppose that we could 
 * // get proper time stamp.
 * tsthex0 = "30..."; // hex of TimeStampToken for signerInfo[0] sigval
 * si0 = info.obj.signerInfoList[0];
 * si0.addUnsigned(new KJUR.asn1.cades.SignatureTimeStamp({tst: tsthex0});
 * esthex = info.obj.getContentInfoEncodedHex(); // CAdES-T
 * </pre>
 * </p>
 *
 * <h4>SAMPLE CODES</h4>
 * <ul>
 * <li><a href="../../tool_cades.html">demo program for CAdES-BES/EPES/T generation</a></li>
 * <li><a href="../../test/qunit-do-asn1cades.html">Unit test code for KJUR.asn1.cades package</a></li>
 * <li><a href="../../test/qunit-do-asn1tsp.html">Unit test code for KJUR.asn1.tsp package (See SimpleTSAAdaptor test)</a></li>
 * <li><a href="../../test/qunit-do-asn1cms.html">Unit test code for KJUR.asn1.cms package (See newSignedData test)</a></li>
 * </ul>
 * 
 * @name KJUR.asn1.cades
 * @namespace
 */
if (typeof KJUR.asn1.cades == "undefined" || !KJUR.asn1.cades) KJUR.asn1.cades = {};

/**
 * class for RFC 5126 CAdES SignaturePolicyIdentifier attribute
 * @name KJUR.asn1.cades.SignaturePolicyIdentifier
 * @class class for RFC 5126 CAdES SignaturePolicyIdentifier attribute
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.cms.Attribute
 * @since jsrsasign 4.7.0 asn1cades 1.0.0
 * @description
 * <pre>
 * SignaturePolicyIdentifier ::= CHOICE {
 *    signaturePolicyId       SignaturePolicyId,
 *    signaturePolicyImplied  SignaturePolicyImplied } -- not used
 *
 * SignaturePolicyImplied ::= NULL
 * SignaturePolicyId ::= SEQUENCE {
 *    sigPolicyId           SigPolicyId,
 *    sigPolicyHash         SigPolicyHash,
 *    sigPolicyQualifiers   SEQUENCE SIZE (1..MAX) OF
 *                             SigPolicyQualifierInfo OPTIONAL }
 * SigPolicyId ::= OBJECT IDENTIFIER
 * SigPolicyHash ::= OtherHashAlgAndValue
 * </pre>
 * @example
 * var o = new KJUR.asn1.cades.SignaturePolicyIdentifier({
 *   oid: '1.2.3.4.5',
 *   hash: {alg: 'sha1', hash: 'a1a2a3a4...'}
 * });
 */
/*
 * id-aa-ets-sigPolicyId OBJECT IDENTIFIER ::= { iso(1)
 *    member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs9(9)
 *    smime(16) id-aa(2) 15 }
 *
 * signature-policy-identifier attribute values have ASN.1 type
 * SignaturePolicyIdentifier:
 *
 * SigPolicyQualifierInfo ::= SEQUENCE {
 *    sigPolicyQualifierId  SigPolicyQualifierId,
 *    sigQualifier          ANY DEFINED BY sigPolicyQualifierId } 
 *
 * sigpolicyQualifierIds defined in the present document:
 * SigPolicyQualifierId ::= OBJECT IDENTIFIER
 * id-spq-ets-uri OBJECT IDENTIFIER ::= { iso(1)
 *    member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs9(9)
 *    smime(16) id-spq(5) 1 }
 *
 * SPuri ::= IA5String
 *
 * id-spq-ets-unotice OBJECT IDENTIFIER ::= { iso(1)
 *    member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs9(9)
 *    smime(16) id-spq(5) 2 }
 *
 * SPUserNotice ::= SEQUENCE {
 *    noticeRef        NoticeReference OPTIONAL,
 *    explicitText     DisplayText OPTIONAL}
 *
 * NoticeReference ::= SEQUENCE {
 *    organization     DisplayText,
 *    noticeNumbers    SEQUENCE OF INTEGER }
 *
 * DisplayText ::= CHOICE {
 *    visibleString    VisibleString  (SIZE (1..200)),
 *    bmpString        BMPString      (SIZE (1..200)),
 *    utf8String       UTF8String     (SIZE (1..200)) }
 */
KJUR.asn1.cades.SignaturePolicyIdentifier = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERObjectIdentifier = _KJUR_asn1.DERObjectIdentifier,
	_DERSequence = _KJUR_asn1.DERSequence,
	_KJUR_asn1_cades = _KJUR_asn1.cades,
	_OtherHashAlgAndValue = _KJUR_asn1_cades.OtherHashAlgAndValue;
	
    _KJUR_asn1_cades.SignaturePolicyIdentifier.superclass.constructor.call(this);
    this.attrTypeOid = "1.2.840.113549.1.9.16.2.15";

    if (params !== undefined) {
        if (typeof params.oid == "string" &&
            typeof params.hash == "object") {
            var dOid = new _DERObjectIdentifier({oid: params.oid});
            var dHash = new _OtherHashAlgAndValue(params.hash);
            var seq = new _DERSequence({array: [dOid, dHash]});
            this.valueList = [seq];
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.cades.SignaturePolicyIdentifier,
                  KJUR.asn1.cms.Attribute);

/**
 * class for OtherHashAlgAndValue ASN.1 object
 * @name KJUR.asn1.cades.OtherHashAlgAndValue
 * @class class for OtherHashAlgAndValue ASN.1 object
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.7.0 asn1cades 1.0.0
 * @description
 * <pre>
 * OtherHashAlgAndValue ::= SEQUENCE {
 *    hashAlgorithm   AlgorithmIdentifier,
 *    hashValue       OtherHashValue }
 * OtherHashValue ::= OCTET STRING
 * </pre>
 */
KJUR.asn1.cades.OtherHashAlgAndValue = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_DEROctetString = _KJUR_asn1.DEROctetString,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_AlgorithmIdentifier = _KJUR_asn1_x509.AlgorithmIdentifier,
	_KJUR_asn1_cades = _KJUR_asn1.cades,
	_OtherHashAlgAndValue = _KJUR_asn1_cades.OtherHashAlgAndValue;

    _OtherHashAlgAndValue.superclass.constructor.call(this);

    this.dAlg = null;
    this.dHash = null;

    this.getEncodedHex = function() {
        var seq = new _DERSequence({array: [this.dAlg, this.dHash]});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (typeof params.alg == "string" &&
            typeof params.hash == "string") {
            this.dAlg = new _AlgorithmIdentifier({name: params.alg});
            this.dHash = new _DEROctetString({hex: params.hash});
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.cades.OtherHashAlgAndValue, KJUR.asn1.ASN1Object);

/**
 * class for RFC 5126 CAdES SignatureTimeStamp attribute
 * @name KJUR.asn1.cades.SignatureTimeStamp
 * @class class for RFC 5126 CAdES SignatureTimeStamp attribute
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.cms.Attribute
 * @since jsrsasign 4.7.0 asn1cades 1.0.0
 * @description
 * <pre>
 * id-aa-signatureTimeStampToken OBJECT IDENTIFIER ::=
 *    1.2.840.113549.1.9.16.2.14
 * SignatureTimeStampToken ::= TimeStampToken
 * </pre>
 */
KJUR.asn1.cades.SignatureTimeStamp = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_ASN1Object = _KJUR_asn1.ASN1Object,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_KJUR_asn1_cades = _KJUR_asn1.cades;

    _KJUR_asn1_cades.SignatureTimeStamp.superclass.constructor.call(this);
    this.attrTypeOid = "1.2.840.113549.1.9.16.2.14";
    this.tstHex = null;

    if (params !== undefined) {
        if (params.res !== undefined) {
            if (typeof params.res == "string" &&
                params.res.match(/^[0-9A-Fa-f]+$/)) {
            } else if (params.res instanceof _ASN1Object) {
            } else {
                throw "res param shall be ASN1Object or hex string";
            }
        }
        if (params.tst !== undefined) {
            if (typeof params.tst == "string" &&
                params.tst.match(/^[0-9A-Fa-f]+$/)) {
                var d = new _ASN1Object();
                this.tstHex = params.tst;
                d.hTLV = this.tstHex;
                d.getEncodedHex();
                this.valueList = [d];
            } else if (params.tst instanceof _ASN1Object) {
            } else {
                throw "tst param shall be ASN1Object or hex string";
            }
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.cades.SignatureTimeStamp,
                  KJUR.asn1.cms.Attribute);

/**
 * class for RFC 5126 CAdES CompleteCertificateRefs attribute
 * @name KJUR.asn1.cades.CompleteCertificateRefs
 * @class class for RFC 5126 CAdES CompleteCertificateRefs attribute
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.cms.Attribute
 * @since jsrsasign 4.7.0 asn1cades 1.0.0
 * @description
 * <pre>
 * id-aa-ets-certificateRefs OBJECT IDENTIFIER = 
 *    1.2.840.113549.1.9.16.2.21
 * CompleteCertificateRefs ::=  SEQUENCE OF OtherCertID
 * </pre>
 * @example
 * o = new KJUR.asn1.cades.CompleteCertificateRefs([certPEM1,certPEM2]);
 */
KJUR.asn1.cades.CompleteCertificateRefs = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_KJUR_asn1_cades = _KJUR_asn1.cades;

    _KJUR_asn1_cades.CompleteCertificateRefs.superclass.constructor.call(this);
    this.attrTypeOid = "1.2.840.113549.1.9.16.2.21";

    /**
     * set value by array
     * @name setByArray
     * @memberOf KJUR.asn1.cades.CompleteCertificateRefs
     * @function
     * @param {Array} a array of {@link KJUR.asn1.cades.OtherCertID} argument
     * @return unspecified
     * @description
     */
    this.setByArray = function(a) {
        this.valueList = [];
        for (var i = 0; i < a.length; i++) {
            var o = new _KJUR_asn1_cades.OtherCertID(a[i]);
            this.valueList.push(o);
        }
    };

    if (params !== undefined) {
        if (typeof params == "object" &&
            typeof params.length == "number") {
            this.setByArray(params);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.cades.CompleteCertificateRefs,
                  KJUR.asn1.cms.Attribute);

/**
 * class for OtherCertID ASN.1 object
 * @name KJUR.asn1.cades.OtherCertID
 * @class class for OtherCertID ASN.1 object
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.7.0 asn1cades 1.0.0
 * @description
 * <pre>
 * OtherCertID ::= SEQUENCE {
 *    otherCertHash    OtherHash,
 *    issuerSerial     IssuerSerial OPTIONAL }
 * </pre>
 * @example
 * o = new KJUR.asn1.cades.OtherCertID(certPEM);
 * o = new KJUR.asn1.cades.OtherCertID({cert:certPEM, hasis: false});
 */
KJUR.asn1.cades.OtherCertID = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_KJUR_asn1_cms = _KJUR_asn1.cms,
	_KJUR_asn1_cades = _KJUR_asn1.cades;

    _KJUR_asn1_cades.OtherCertID.superclass.constructor.call(this);

    this.hasIssuerSerial = true;
    this.dOtherCertHash = null;
    this.dIssuerSerial = null;

    /**
     * set value by PEM string of certificate
     * @name setByCertPEM
     * @memberOf KJUR.asn1.cades.OtherCertID
     * @function
     * @param {String} certPEM PEM string of certificate
     * @return unspecified
     * @description
     * This method will set value by a PEM string of a certificate.
     * This will add IssuerAndSerialNumber by default 
     * which depends on hasIssuerSerial flag.
     */
    this.setByCertPEM = function(certPEM) {
        this.dOtherCertHash = new _KJUR_asn1_cades.OtherHash(certPEM);
        if (this.hasIssuerSerial)
            this.dIssuerSerial = 
	        new _KJUR_asn1_cms.IssuerAndSerialNumber(certPEM);
    };

    this.getEncodedHex = function() {
        if (this.hTLV != null) return this.hTLV;
        if (this.dOtherCertHash == null)
            throw "otherCertHash not set";
        var a = [this.dOtherCertHash];
        if (this.dIssuerSerial != null)
            a.push(this.dIssuerSerial);
        var seq = new _KJUR_asn1.DERSequence({array: a});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
        if (typeof params == "string" &&
            params.indexOf("-----BEGIN ") != -1) {
            this.setByCertPEM(params);
        }
        if (typeof params == "object") {
            if (params.hasis === false)
                this.hasIssuerSerial = false;
            if (typeof params.cert == "string")
                this.setByCertPEM(params.cert);
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.cades.OtherCertID, KJUR.asn1.ASN1Object);

/**
 * class for OtherHash ASN.1 object
 * @name KJUR.asn1.cades.OtherHash
 * @class class for OtherHash ASN.1 object
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.7.0 asn1cades 1.0.0
 * @description
 * <pre>
 * OtherHash ::= CHOICE {
 *    sha1Hash   OtherHashValue,  -- This contains a SHA-1 hash
 *    otherHash  OtherHashAlgAndValue}
 * OtherHashValue ::= OCTET STRING
 * </pre>
 * @example
 * o = new KJUR.asn1.cades.OtherHash("1234");
 * o = new KJUR.asn1.cades.OtherHash(certPEMStr); // default alg=sha256
 * o = new KJUR.asn1.cades.OtherHash({alg: 'sha256', hash: '1234'});
 * o = new KJUR.asn1.cades.OtherHash({alg: 'sha256', cert: certPEM});
 * o = new KJUR.asn1.cades.OtherHash({cert: certPEM});
 */
KJUR.asn1.cades.OtherHash = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_KJUR_asn1_cms = _KJUR_asn1.cms,
	_KJUR_asn1_cades = _KJUR_asn1.cades,
	_OtherHashAlgAndValue = _KJUR_asn1_cades.OtherHashAlgAndValue,
	_hashHex = _KJUR.crypto.Util.hashHex;

    _KJUR_asn1_cades.OtherHash.superclass.constructor.call(this);

    this.alg = 'sha256';
    this.dOtherHash = null;

    /**
     * set value by PEM string of certificate
     * @name setByCertPEM
     * @memberOf KJUR.asn1.cades.OtherHash
     * @function
     * @param {String} certPEM PEM string of certificate
     * @return unspecified
     * @description
     * This method will set value by a PEM string of a certificate.
     * An algorithm used to hash certificate data will
     * be defined by 'alg' property and 'sha256' is default.
     */
    this.setByCertPEM = function(certPEM) {
        if (certPEM.indexOf("-----BEGIN ") == -1)
            throw "certPEM not to seem PEM format";
        var hex = pemtohex(certPEM);
        var hash = _hashHex(hex, this.alg);
        this.dOtherHash = 
            new _OtherHashAlgAndValue({alg: this.alg, hash: hash});
    };

    this.getEncodedHex = function() {
        if (this.dOtherHash == null)
            throw "OtherHash not set";
        return this.dOtherHash.getEncodedHex();
    };

    if (params !== undefined) {
        if (typeof params == "string") {
            if (params.indexOf("-----BEGIN ") != -1) {
                this.setByCertPEM(params);
            } else if (params.match(/^[0-9A-Fa-f]+$/)) {
                this.dOtherHash = new _KJUR_asn1.DEROctetString({hex: params});
            } else {
                throw "unsupported string value for params";
            }
        } else if (typeof params == "object") {
            if (typeof params.cert == "string") {
                if (typeof params.alg == "string")
                    this.alg = params.alg;
                this.setByCertPEM(params.cert);
            } else {
                this.dOtherHash = new _OtherHashAlgAndValue(params);
            }
        }
    }
};
YAHOO.lang.extend(KJUR.asn1.cades.OtherHash, KJUR.asn1.ASN1Object);


// == BEGIN UTILITIES =====================================================

/**
 * CAdES utiliteis class
 * @name KJUR.asn1.cades.CAdESUtil
 * @class CAdES utilities class
 * @since jsrsasign 4.7.0 asn1cades 1.0.0
 */
KJUR.asn1.cades.CAdESUtil = new function() {
};
/*
 *
 */
KJUR.asn1.cades.CAdESUtil.addSigTS = function(dCMS, siIdx, sigTSHex) {
};
/**
 * parse CMS SignedData to add unsigned attributes
 * @name parseSignedDataForAddingUnsigned
 * @memberOf KJUR.asn1.cades.CAdESUtil
 * @function
 * @param {String} hex hexadecimal string of ContentInfo of CMS SignedData
 * @return {Object} associative array of parsed data
 * @description
 * This method will parse a hexadecimal string of 
 * ContentInfo with CMS SignedData to add a attribute
 * to unsigned attributes field in a signerInfo field.
 * Parsed result will be an associative array which has
 * following properties:
 * <ul>
 * <li>version - hex of CMSVersion ASN.1 TLV</li>
 * <li>algs - hex of DigestAlgorithms ASN.1 TLV</li>
 * <li>encapcontent - hex of EncapContentInfo ASN.1 TLV</li>
 * <li>certs - hex of Certificates ASN.1 TLV</li>
 * <li>revs - hex of RevocationInfoChoices ASN.1 TLV</li>
 * <li>si[] - array of SignerInfo properties</li>
 * <li>obj - parsed KJUR.asn1.cms.SignedData object</li>
 * </ul>
 * @example
 * info = KJUR.asn1.cades.CAdESUtil.parseSignedDataForAddingUnsigned(beshex);
 * sd = info.obj;
 */
KJUR.asn1.cades.CAdESUtil.parseSignedDataForAddingUnsigned = function(hex) {
    var _ASN1HEX = ASN1HEX,
	_getChildIdx = _ASN1HEX.getChildIdx,
	_getTLV = _ASN1HEX.getTLV,
	_getTLVbyList = _ASN1HEX.getTLVbyList,
	_getIdxbyList = _ASN1HEX.getIdxbyList,
	_KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_ASN1Object = _KJUR_asn1.ASN1Object,
	_KJUR_asn1_cms = _KJUR_asn1.cms,
	_SignedData = _KJUR_asn1_cms.SignedData,
	_KJUR_asn1_cades = _KJUR_asn1.cades,
	_CAdESUtil = _KJUR_asn1_cades.CAdESUtil;
    
    var r = {};

    // 1. not oid signed-data then error
    if (_getTLVbyList(hex, 0, [0]) != "06092a864886f70d010702")
        throw "hex is not CMS SignedData";

    var iSD = _getIdxbyList(hex, 0, [1, 0]);
    var aSDChildIdx = _getChildIdx(hex, iSD);
    if (aSDChildIdx.length < 4)
        throw "num of SignedData elem shall be 4 at least";

    // 2. HEXs of SignedData children
    // 2.1. SignedData.CMSVersion
    var iVersion = aSDChildIdx.shift();
    r.version = _getTLV(hex, iVersion);

    // 2.2. SignedData.DigestAlgorithms
    var iAlgs = aSDChildIdx.shift();
    r.algs = _getTLV(hex, iAlgs);

    // 2.3. SignedData.EncapContentInfo
    var iEncapContent = aSDChildIdx.shift();
    r.encapcontent = _getTLV(hex, iEncapContent);

    // 2.4. [0]Certs 
    r.certs = null;
    r.revs = null;
    r.si = [];

    var iNext = aSDChildIdx.shift();
    if (hex.substr(iNext, 2) == "a0") {
        r.certs = _getTLV(hex, iNext);
        iNext = aSDChildIdx.shift();
    }

    // 2.5. [1]Revs
    if (hex.substr(iNext, 2) == "a1") {
        r.revs = _getTLV(hex, iNext);
        iNext = aSDChildIdx.shift();
    }

    // 2.6. SignerInfos
    var iSignerInfos = iNext;
    if (hex.substr(iSignerInfos, 2) != "31")
        throw "Can't find signerInfos";

    var aSIIndex = _getChildIdx(hex, iSignerInfos);
    //alert(aSIIndex.join("-"));

    for (var i = 0; i < aSIIndex.length; i++) {
        var iSI = aSIIndex[i];
        var pSI = _CAdESUtil.parseSignerInfoForAddingUnsigned(hex, iSI, i);
        r.si[i] = pSI;
    }

    // x. obj(SignedData)
    var tmp = null;
    r.obj = new _SignedData();

    tmp = new _ASN1Object();
    tmp.hTLV = r.version;
    r.obj.dCMSVersion = tmp;

    tmp = new _ASN1Object();
    tmp.hTLV = r.algs;
    r.obj.dDigestAlgs = tmp;

    tmp = new _ASN1Object();
    tmp.hTLV = r.encapcontent;
    r.obj.dEncapContentInfo = tmp;

    tmp = new _ASN1Object();
    tmp.hTLV = r.certs;
    r.obj.dCerts = tmp;

    r.obj.signerInfoList = [];
    for (var i = 0; i < r.si.length; i++) {
        r.obj.signerInfoList.push(r.si[i].obj);
    }

    return r;
};

/**
 * parse SignerInfo to add unsigned attributes
 * @name parseSignerInfoForAddingUnsigned
 * @memberOf KJUR.asn1.cades.CAdESUtil
 * @function
 * @param {String} hex hexadecimal string of SignerInfo
 * @return {Object} associative array of parsed data
 * @description
 * This method will parse a hexadecimal string of 
 * SignerInfo to add a attribute
 * to unsigned attributes field in a signerInfo field.
 * Parsed result will be an associative array which has
 * following properties:
 * <ul>
 * <li>version - hex TLV of version</li>
 * <li>si - hex TLV of SignerIdentifier</li>
 * <li>digalg - hex TLV of DigestAlgorithm</li>
 * <li>sattrs - hex TLV of SignedAttributes</li>
 * <li>sigalg - hex TLV of SignatureAlgorithm</li>
 * <li>sig - hex TLV of signature</li>
 * <li>sigval = hex V of signature</li>
 * <li>obj - parsed KJUR.asn1.cms.SignerInfo object</li>
 * </ul>
 * NOTE: Parsing of unsigned attributes will be provided in the
 * future version. That's way this version provides support
 * for CAdES-T and not for CAdES-C.
 */
KJUR.asn1.cades.CAdESUtil.parseSignerInfoForAddingUnsigned = function(hex, iSI, nth) {
    var _ASN1HEX = ASN1HEX,
	_getChildIdx = _ASN1HEX.getChildIdx,
	_getTLV = _ASN1HEX.getTLV,
	_getV = _ASN1HEX.getV,
	_KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_ASN1Object = _KJUR_asn1.ASN1Object,
	_KJUR_asn1_cms = _KJUR_asn1.cms,
	_AttributeList = _KJUR_asn1_cms.AttributeList,
	_SignerInfo = _KJUR_asn1_cms.SignerInfo;

    var r = {};
    var aSIChildIdx = _getChildIdx(hex, iSI);
    //alert(aSIChildIdx.join("="));

    if (aSIChildIdx.length != 6)
        throw "not supported items for SignerInfo (!=6)"; 

    // 1. SignerInfo.CMSVersion
    var iVersion = aSIChildIdx.shift();
    r.version = _getTLV(hex, iVersion);

    // 2. SignerIdentifier(IssuerAndSerialNumber)
    var iIdentifier = aSIChildIdx.shift();
    r.si = _getTLV(hex, iIdentifier);

    // 3. DigestAlgorithm
    var iDigestAlg = aSIChildIdx.shift();
    r.digalg = _getTLV(hex, iDigestAlg);

    // 4. SignedAttrs
    var iSignedAttrs = aSIChildIdx.shift();
    r.sattrs = _getTLV(hex, iSignedAttrs);

    // 5. SigAlg
    var iSigAlg = aSIChildIdx.shift();
    r.sigalg = _getTLV(hex, iSigAlg);

    // 6. Signature
    var iSig = aSIChildIdx.shift();
    r.sig = _getTLV(hex, iSig);
    r.sigval = _getV(hex, iSig);

    // 7. obj(SignerInfo)
    var tmp = null;
    r.obj = new _SignerInfo();

    tmp = new _ASN1Object();
    tmp.hTLV = r.version;
    r.obj.dCMSVersion = tmp;

    tmp = new _ASN1Object();
    tmp.hTLV = r.si;
    r.obj.dSignerIdentifier = tmp;

    tmp = new _ASN1Object();
    tmp.hTLV = r.digalg;
    r.obj.dDigestAlgorithm = tmp;

    tmp = new _ASN1Object();
    tmp.hTLV = r.sattrs;
    r.obj.dSignedAttrs = tmp;

    tmp = new _ASN1Object();
    tmp.hTLV = r.sigalg;
    r.obj.dSigAlg = tmp;

    tmp = new _ASN1Object();
    tmp.hTLV = r.sig;
    r.obj.dSig = tmp;

    r.obj.dUnsignedAttrs = new _AttributeList();

    return r;
};

/* asn1csr-1.0.6.js (c) 2015-2018 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * asn1csr.js - ASN.1 DER encoder classes for PKCS#10 CSR
 *
 * Copyright (c) 2015-2018 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name asn1csr-1.0.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version jsrsasign 8.0.5 asn1csr 1.0.6 (2018-Jan-13)
 * @since jsrsasign 4.9.0
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

/**
 * kjur's ASN.1 class for CSR/PKCS#10 name space
 * <p>
 * This name space is a sub name space for {@link KJUR.asn1}.
 * This name space contains classes for
 * <a href="https://tools.ietf.org/html/rfc2986">RFC 2986</a>
 * certificate signing request(CSR/PKCS#10) and its utilities
 * to be issued your certificate from certification authorities.
 * <h4>PROVIDING ASN.1 STRUCTURES</h4>
 * <ul>
 * <li>{@link KJUR.asn1.csr.CertificationRequest}</li>
 * <li>{@link KJUR.asn1.csr.CertificationRequestInfo}</li>
 * </ul>
 * <h4>PROVIDING UTILITY CLASSES</h4>
 * <ul>
 * <li>{@link KJUR.asn1.csr.CSRUtil}</li>
 * </ul>
 * {@link KJUR.asn1.csr.CSRUtil.newCSRPEM} method is very useful to
 * get your certificate signing request (CSR/PKCS#10) file.
 * </p>
 * @name KJUR.asn1.csr
 * @namespace
 */
if (typeof KJUR.asn1.csr == "undefined" || !KJUR.asn1.csr) KJUR.asn1.csr = {};

/**
 * ASN.1 CertificationRequest structure class
 * @name KJUR.asn1.csr.CertificationRequest
 * @class ASN.1 CertificationRequest structure class
 * @param {Array} params associative array of parameters (ex. {})
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.9.0 asn1csr 1.0.0
 * @description
 * <br/>
 * @example
 * csri = new KJUR.asn1.csr.CertificationRequestInfo();
 * csri.setSubjectByParam({'str': '/C=US/O=Test/CN=example.com'});
 * csri.setSubjectPublicKeyByGetKey(pubKeyObj);
 * csr = new KJUR.asn1.csr.CertificationRequest({'csrinfo': csri});
 * csr.sign("SHA256withRSA", prvKeyObj);
 * pem = csr.getPEMString();
 * 
 * // -- DEFINITION OF ASN.1 SYNTAX --
 * // CertificationRequest ::= SEQUENCE {
 * //   certificationRequestInfo CertificationRequestInfo,
 * //   signatureAlgorithm       AlgorithmIdentifier{{ SignatureAlgorithms }},
 * //   signature                BIT STRING }
 * //
 * // CertificationRequestInfo ::= SEQUENCE {
 * //   version       INTEGER { v1(0) } (v1,...),
 * //   subject       Name,
 * //   subjectPKInfo SubjectPublicKeyInfo{{ PKInfoAlgorithms }},
 * //   attributes    [0] Attributes{{ CRIAttributes }} }
 */
KJUR.asn1.csr.CertificationRequest = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERBitString = _KJUR_asn1.DERBitString,
	_DERSequence = _KJUR_asn1.DERSequence,
	_KJUR_asn1_csr = _KJUR_asn1.csr,
	_KJUR_asn1_x509 = _KJUR_asn1.x509;

    _KJUR_asn1_csr.CertificationRequest.superclass.constructor.call(this);

    var asn1CSRInfo = null;
    var asn1SignatureAlg = null;
    var asn1Sig = null;
    var hexSig = null;
    var prvKey = null;

    /**
     * sign CertificationRequest and set signature value internally<br/>
     * @name sign
     * @memberOf KJUR.asn1.csr.CertificationRequest#
     * @function
     * @description
     * This method self-signs CertificateRequestInfo with a subject's
     * private key and set signature value internally.
     * <br/>
     * @example
     * csr = new KJUR.asn1.csr.CertificationRequest({'csrinfo': csri});
     * csr.sign("SHA256withRSA", prvKeyObj);
     */
    this.sign = function(sigAlgName, prvKeyObj) {
	if (this.prvKey == null) this.prvKey = prvKeyObj;

	this.asn1SignatureAlg = 
	    new _KJUR_asn1_x509.AlgorithmIdentifier({'name': sigAlgName});

        sig = new _KJUR.crypto.Signature({'alg': sigAlgName});
        sig.init(this.prvKey);
        sig.updateHex(this.asn1CSRInfo.getEncodedHex());
        this.hexSig = sig.sign();

        this.asn1Sig = new _DERBitString({'hex': '00' + this.hexSig});
        var seq = new _DERSequence({'array': [this.asn1CSRInfo,
                                              this.asn1SignatureAlg,
                                              this.asn1Sig]});
        this.hTLV = seq.getEncodedHex();
        this.isModified = false;
    };

    /**
     * get PEM formatted certificate signing request (CSR/PKCS#10)<br/>
     * @name getPEMString
     * @memberOf KJUR.asn1.csr.CertificationRequest#
     * @function
     * @return PEM formatted string of CSR/PKCS#10
     * @description
     * This method is to a get CSR PEM string after signed.
     * <br/>
     * @example
     * csr = new KJUR.asn1.csr.CertificationRequest({'csrinfo': csri});
     * csr.sign();
     * pem =  csr.getPEMString();
     * // pem will be following:
     * // -----BEGIN CERTIFICATE REQUEST-----
     * // MII ...snip...
     * // -----END CERTIFICATE REQUEST-----
     */
    this.getPEMString = function() {
	return hextopem(this.getEncodedHex(), "CERTIFICATE REQUEST");
    };

    this.getEncodedHex = function() {
        if (this.isModified == false && this.hTLV != null) return this.hTLV;
        throw "not signed yet";
    };

    if (params !== undefined && params.csrinfo !== undefined) {
        this.asn1CSRInfo = params.csrinfo;
    }
};
YAHOO.lang.extend(KJUR.asn1.csr.CertificationRequest, KJUR.asn1.ASN1Object);

/**
 * ASN.1 CertificationRequestInfo structure class
 * @name KJUR.asn1.csr.CertificationRequestInfo
 * @class ASN.1 CertificationRequestInfo structure class
 * @param {Array} params associative array of parameters (ex. {})
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 4.9.0 asn1csr 1.0.0
 * @description
 * <pre>
 * // -- DEFINITION OF ASN.1 SYNTAX --
 * // CertificationRequestInfo ::= SEQUENCE {
 * //   version       INTEGER { v1(0) } (v1,...),
 * //   subject       Name,
 * //   subjectPKInfo SubjectPublicKeyInfo{{ PKInfoAlgorithms }},
 * //   attributes    [0] Attributes{{ CRIAttributes }} }
 * </pre>
 * <br/>
 * @example
 * csri = new KJUR.asn1.csr.CertificationRequestInfo();
 * csri.setSubjectByParam({'str': '/C=US/O=Test/CN=example.com'});
 * csri.setSubjectPublicKeyByGetKey(pubKeyObj);
 */
KJUR.asn1.csr.CertificationRequestInfo = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERInteger = _KJUR_asn1.DERInteger,
	_DERSequence = _KJUR_asn1.DERSequence,
	_DERSet = _KJUR_asn1.DERSet,
	_DERNull = _KJUR_asn1.DERNull,
	_DERTaggedObject = _KJUR_asn1.DERTaggedObject,
	_DERObjectIdentifier = _KJUR_asn1.DERObjectIdentifier,
	_KJUR_asn1_csr = _KJUR_asn1.csr,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_X500Name = _KJUR_asn1_x509.X500Name,
	_Extension = _KJUR_asn1_x509.Extension,
	_KEYUTIL = KEYUTIL;

    _KJUR_asn1_csr.CertificationRequestInfo.superclass.constructor.call(this);

    this._initialize = function() {
        this.asn1Array = new Array();

	this.asn1Version = new _DERInteger({'int': 0});
	this.asn1Subject = null;
	this.asn1SubjPKey = null;
	this.extensionsArray = new Array();
    };

    /**
     * set subject name field by parameter
     * @name setSubjectByParam
     * @memberOf KJUR.asn1.csr.CertificationRequestInfo#
     * @function
     * @param {Array} x500NameParam X500Name parameter
     * @description
     * @example
     * csri.setSubjectByParam({'str': '/C=US/CN=b'});
     * @see KJUR.asn1.x509.X500Name
     */
    this.setSubjectByParam = function(x500NameParam) {
        this.asn1Subject = new _X500Name(x500NameParam);
    };

    /**
     * set subject public key info by RSA/ECDSA/DSA key parameter
     * @name setSubjectPublicKeyByGetKey
     * @memberOf KJUR.asn1.csr.CertificationRequestInfo#
     * @function
     * @param {Object} keyParam public key parameter which passed to {@link KEYUTIL.getKey} argument
     * @description
     * @example
     * csri.setSubjectPublicKeyByGetKeyParam(certPEMString); // or 
     * csri.setSubjectPublicKeyByGetKeyParam(pkcs8PublicKeyPEMString); // or 
     * csir.setSubjectPublicKeyByGetKeyParam(kjurCryptoECDSAKeyObject); // et.al.
     * @see KJUR.asn1.x509.SubjectPublicKeyInfo
     * @see KEYUTIL.getKey
     */
    this.setSubjectPublicKeyByGetKey = function(keyParam) {
        var keyObj = _KEYUTIL.getKey(keyParam);
        this.asn1SubjPKey = 
	    new _KJUR_asn1_x509.SubjectPublicKeyInfo(keyObj);
    };

    /**
     * append X.509v3 extension to this object by name and parameters
     * @name appendExtensionByName
     * @memberOf KJUR.asn1.csr.CertificationRequestInfo#
     * @function
     * @param {name} name name of X.509v3 Extension object
     * @param {Array} extParams parameters as argument of Extension constructor.
     * @see KJUR.asn1.x509.Extension
     * @description
     * @example
     * var o = new KJUR.asn1.csr.CertificationRequestInfo();
     * o.appendExtensionByName('BasicConstraints', {'cA':true, 'critical': true});
     * o.appendExtensionByName('KeyUsage', {'bin':'11'});
     * o.appendExtensionByName('CRLDistributionPoints', {uri: 'http://aaa.com/a.crl'});
     * o.appendExtensionByName('ExtKeyUsage', {array: [{name: 'clientAuth'}]});
     * o.appendExtensionByName('AuthorityKeyIdentifier', {kid: '1234ab..'});
     * o.appendExtensionByName('AuthorityInfoAccess', {array: [{accessMethod:{oid:...},accessLocation:{uri:...}}]});
     */
    this.appendExtensionByName = function(name, extParams) {
	_Extension.appendByNameToArray(name,
				       extParams,
				       this.extensionsArray);
    };

    this.getEncodedHex = function() {
        this.asn1Array = new Array();

        this.asn1Array.push(this.asn1Version);
        this.asn1Array.push(this.asn1Subject);
        this.asn1Array.push(this.asn1SubjPKey);

	// extensionRequest
	if (this.extensionsArray.length > 0) {
            var extSeq = new _DERSequence({array: this.extensionsArray});
	    var extSet = new _DERSet({array: [extSeq]});
	    var extSeq2 = new _DERSequence({array: [
		new _DERObjectIdentifier({oid: "1.2.840.113549.1.9.14"}),
		extSet
	    ]});
            var extTagObj = new _DERTaggedObject({
		explicit: true,
		tag: 'a0',
		obj: extSeq2
	    });
            this.asn1Array.push(extTagObj);
	} else {
            var extTagObj = new _DERTaggedObject({
		explicit: false,
		tag: 'a0',
		obj: new _DERNull()
	    });
            this.asn1Array.push(extTagObj);
	}

        var o = new _DERSequence({"array": this.asn1Array});
        this.hTLV = o.getEncodedHex();
        this.isModified = false;
        return this.hTLV;
    };

    this._initialize();
};
YAHOO.lang.extend(KJUR.asn1.csr.CertificationRequestInfo, KJUR.asn1.ASN1Object);

/**
 * Certification Request (CSR/PKCS#10) utilities class<br/>
 * @name KJUR.asn1.csr.CSRUtil
 * @class Certification Request (CSR/PKCS#10) utilities class
 * @description
 * This class provides utility static methods for CSR/PKCS#10.
 * Here is a list of methods:
 * <ul>
 * <li>{@link KJUR.asn1.csr.CSRUtil.newCSRPEM}</li>
 * <li>{@link KJUR.asn1.csr.CSRUtil.getInfo}</li>
 * </ul>
 * <br/>
 */
KJUR.asn1.csr.CSRUtil = new function() {
};

/**
 * generate a PEM format of CSR/PKCS#10 certificate signing request
 * @name newCSRPEM
 * @memberOf KJUR.asn1.csr.CSRUtil
 * @function
 * @param {Array} param parameter to generate CSR
 * @since jsrsasign 4.9.0 asn1csr 1.0.0
 * @description
 * This method can generate a CSR certificate signing
 * request by a simple JSON object which has following parameters:
 * <ul>
 * <li>subject - parameter to be passed to {@link KJUR.asn1.x509.X500Name}</li>
 * <li>sbjpubkey - parameter to be passed to {@link KEYUTIL.getKey}</li>
 * <li>sigalg - signature algorithm name (ex. SHA256withRSA)</li>
 * <li>sbjprvkey - parameter to be passed to {@link KEYUTIL.getKey}</li>
 * </ul>
 *
 * @example
 * // 1) by key object
 * pem = KJUR.asn1.csr.CSRUtil.newCSRPEM({
 *   subject: {str: '/C=US/O=Test/CN=example.com'},
 *   sbjpubkey: pubKeyObj,
 *   sigalg: "SHA256withRSA",
 *   sbjprvkey: prvKeyObj
 * });
 *
 * // 2) by private/public key PEM 
 * pem = KJUR.asn1.csr.CSRUtil.newCSRPEM({
 *   subject: {str: '/C=US/O=Test/CN=example.com'},
 *   sbjpubkey: pubKeyPEM,
 *   sigalg: "SHA256withRSA",
 *   sbjprvkey: prvKeyPEM
 * });
 *
 * // 3) with generateKeypair
 * kp = KEYUTIL.generateKeypair("RSA", 2048);
 * pem = KJUR.asn1.csr.CSRUtil.newCSRPEM({
 *   subject: {str: '/C=US/O=Test/CN=example.com'},
 *   sbjpubkey: kp.pubKeyObj,
 *   sigalg: "SHA256withRSA",
 *   sbjprvkey: kp.prvKeyObj
 * });
 *
 * // 4) by private/public key PEM with extension
 * pem = KJUR.asn1.csr.CSRUtil.newCSRPEM({
 *   subject: {str: '/C=US/O=Test/CN=example.com'},
 *   ext: [
 *     {subjectAltName: {array: [{dns: 'example.net'}]}
 *   ],
 *   sbjpubkey: pubKeyPEM,
 *   sigalg: "SHA256withRSA",
 *   sbjprvkey: prvKeyPEM
 * });
 */
KJUR.asn1.csr.CSRUtil.newCSRPEM = function(param) {
    var _KEYUTIL = KEYUTIL,
	_KJUR_asn1_csr = KJUR.asn1.csr;

    if (param.subject === undefined) throw "parameter subject undefined";
    if (param.sbjpubkey === undefined) throw "parameter sbjpubkey undefined";
    if (param.sigalg === undefined) throw "parameter sigalg undefined";
    if (param.sbjprvkey === undefined) throw "parameter sbjpubkey undefined";

    var csri = new _KJUR_asn1_csr.CertificationRequestInfo();
    csri.setSubjectByParam(param.subject);
    csri.setSubjectPublicKeyByGetKey(param.sbjpubkey);

    if (param.ext !== undefined && param.ext.length !== undefined) {
	for (var i = 0; i < param.ext.length; i++) {
	    for (key in param.ext[i]) {
                csri.appendExtensionByName(key, param.ext[i][key]);
	    }
	}
    }

    var csr = new _KJUR_asn1_csr.CertificationRequest({'csrinfo': csri});
    var prvKey = _KEYUTIL.getKey(param.sbjprvkey);
    csr.sign(param.sigalg, prvKey);

    var pem = csr.getPEMString();
    return pem;
};

/**
 * get field values from CSR/PKCS#10 PEM string<br/>
 * @name getInfo
 * @memberOf KJUR.asn1.csr.CSRUtil
 * @function
 * @param {String} sPEM PEM string of CSR/PKCS#10
 * @returns {Object} JSON object with parsed parameters such as name or public key
 * @since jsrsasign 6.1.3 asn1csr 1.0.1
 * @description
 * This method parses PEM CSR/PKCS#1 string and retrieves
 * subject name and public key. Following parameters are available in the
 * resulted JSON object.
 * <ul>
 * <li>subject.name - subject name string (ex. /C=US/O=Test)</li>
 * <li>subject.hex - hexadecimal string of X.500 Name of subject</li>
 * <li>pubkey.obj - subject public key object such as RSAKey, KJUR.crypto.{ECDSA,DSA}</li>
 * <li>pubkey.hex - hexadecimal string of subject public key</li>
 * </ul>
 *
 * @example
 * o = KJUR.asn1.csr.CSRUtil.getInfo("-----BEGIN CERTIFICATE REQUEST...");
 * console.log(o.subject.name) &rarr; "/C=US/O=Test"
 */
KJUR.asn1.csr.CSRUtil.getInfo = function(sPEM) {
    var _ASN1HEX = ASN1HEX;
    var _getTLVbyList = _ASN1HEX.getTLVbyList;

    var result = {};
    result.subject = {};
    result.pubkey = {};

    if (sPEM.indexOf("-----BEGIN CERTIFICATE REQUEST") == -1)
	throw "argument is not PEM file";

    var hex = pemtohex(sPEM, "CERTIFICATE REQUEST");

    result.subject.hex = _getTLVbyList(hex, 0, [0, 1]);
    result.subject.name = X509.hex2dn(result.subject.hex);

    result.pubkey.hex = _getTLVbyList(hex, 0, [0, 2]);
    result.pubkey.obj = KEYUTIL.getKey(result.pubkey.hex, null, "pkcs8pub");

    return result;
};


/* asn1ocsp-1.0.3.js (c) 2016 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * asn1ocsp.js - ASN.1 DER encoder classes for OCSP protocol
 *
 * Copyright (c) 2016-2017 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name asn1ocsp-1.0.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version jsrsasign 7.2.1 asn1ocsp 1.0.3 (2017-Jun-03)
 * @since jsrsasign 6.1.0
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

if (typeof KJUR == "undefined" || !KJUR) KJUR = {};
if (typeof KJUR.asn1 == "undefined" || !KJUR.asn1) KJUR.asn1 = {};

/**
 * ASN.1 classes for OCSP protocol<br/>
 * <p>
 * This name space provides 
 * <a href="https://tools.ietf.org/html/rfc6960">RFC 6960
 * Online Certificate Status Protocol (OCSP)</a> ASN.1 request and response generator.
 *
 * <h4>FEATURES</h4>
 * <ul>
 * <li>easily generate OCSP data</li>
 * </ul>
 * 
 * <h4>PROVIDED CLASSES</h4>
 * <ul>
 * <li>{@link KJUR.asn1.ocsp.CertID} for ASN.1 class as defined in 
 * <a href="https://tools.ietf.org/html/rfc6960#section-4.1.1">RFC 6960 4.1.1</a>. </li>
 * <li>{@link KJUR.asn1.ocsp.Request} for ASN.1 class as defined in
 * <a href="https://tools.ietf.org/html/rfc6960#section-4.1.1">RFC 6960 4.1.1</a>. </li>
 * <li>{@link KJUR.asn1.ocsp.TBSRequest} for ASN.1 class as defined in
 * <a href="https://tools.ietf.org/html/rfc6960#section-4.1.1">RFC 6960 4.1.1</a>. </li>
 * <li>{@link KJUR.asn1.ocsp.OCSPRequest} for ASN.1 class as defined in
 * <a href="https://tools.ietf.org/html/rfc6960#section-4.1.1">RFC 6960 4.1.1</a>. </li>
 * <li>{@link KJUR.asn1.ocsp.OCSPUtil} for static utility methods.</li>
 * </ul>
 * </p>
 * @name KJUR.asn1.ocsp
 * @namespace
 */
if (typeof KJUR.asn1.ocsp == "undefined" || !KJUR.asn1.ocsp) KJUR.asn1.ocsp = {};

KJUR.asn1.ocsp.DEFAULT_HASH = "sha1";

/**
 * ASN.1 CertID class for OCSP<br/>
 * @name KJUR.asn1.ocsp.CertID
 * @class ASN.1 CertID class for OCSP
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 6.1.0 asn1ocsp 1.0.0
 * @description
 * CertID ASN.1 class is defined in 
 * <a href="https://tools.ietf.org/html/rfc6960#section-4.1.1">RFC 6960 4.1.1</a>. 
 * <pre>
 * CertID ::= SEQUENCE {
 *   hashAlgorithm   AlgorithmIdentifier,
 *   issuerNameHash  OCTET STRING, -- Hash of issuer's DN
 *   issuerKeyHash   OCTET STRING, -- Hash of issuer's public key
 *   serialNumber    CertificateSerialNumber }
 * </pre>
 * @example
 * // default constructor
 * o = new KJUR.asn1.ocsp.CertID();
 * // constructor with certs (sha1 is used by default)
 * o = new KJUR.asn1.ocsp.CertID({issuerCert: "-----BEGIN...", subjectCert: "-----BEGIN..."});
 * // constructor with certs and sha256
 * o = new KJUR.asn1.ocsp.CertID({issuerCert: "-----BEGIN...", subjectCert: "-----BEGIN...", alg: "sha256"});
 * // constructor with values
 * o = new KJUR.asn1.ocsp.CertID({namehash: "1a...", keyhash: "ad...", serial: "1234", alg: "sha256"});
 */
KJUR.asn1.ocsp.CertID = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DEROctetString = _KJUR_asn1.DEROctetString,
	_DERInteger = _KJUR_asn1.DERInteger,
	_DERSequence = _KJUR_asn1.DERSequence,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_AlgorithmIdentifier = _KJUR_asn1_x509.AlgorithmIdentifier,
	_KJUR_asn1_ocsp = _KJUR_asn1.ocsp,
	_DEFAULT_HASH = _KJUR_asn1_ocsp.DEFAULT_HASH,
	_KJUR_crypto = _KJUR.crypto,
	_hashHex = _KJUR_crypto.Util.hashHex,
	_X509 = X509,
	_ASN1HEX = ASN1HEX;

    _KJUR_asn1_ocsp.CertID.superclass.constructor.call(this);

    this.dHashAlg = null;
    this.dIssuerNameHash = null;
    this.dIssuerKeyHash = null;
    this.dSerialNumber = null;

    /**
     * set CertID ASN.1 object by values.<br/>
     * @name setByValue
     * @memberOf KJUR.asn1.ocsp.CertID#
     * @function
     * @param {String} issuerNameHashHex hexadecimal string of hash value of issuer name
     * @param {String} issuerKeyHashHex hexadecimal string of hash value of issuer public key
     * @param {String} serialNumberHex hexadecimal string of certificate serial number to be verified
     * @param {String} algName hash algorithm name used for above arguments (ex. "sha1") DEFAULT: sha1
     * @since jsrsasign 6.1.0 asn1ocsp 1.0.0
     * @example
     * o = new KJUR.asn1.ocsp.CertID();
     * o.setByValue("1fac...", "fd3a...", "1234"); // sha1 is used by default
     * o.setByValue("1fac...", "fd3a...", "1234", "sha256");
     */
    this.setByValue = function(issuerNameHashHex, issuerKeyHashHex,
			       serialNumberHex, algName) {
	if (algName === undefined) algName = _DEFAULT_HASH;
	this.dHashAlg =        new _AlgorithmIdentifier({name: algName});
	this.dIssuerNameHash = new _DEROctetString({hex: issuerNameHashHex});
	this.dIssuerKeyHash =  new _DEROctetString({hex: issuerKeyHashHex});
	this.dSerialNumber =   new _DERInteger({hex: serialNumberHex});
    };

    /**
     * set CertID ASN.1 object by PEM certificates.<br/>
     * @name setByCert
     * @memberOf KJUR.asn1.ocsp.CertID#
     * @function
     * @param {String} issuerCert string of PEM issuer certificate
     * @param {String} subjectCert string of PEM subject certificate to be verified by OCSP
     * @param {String} algName hash algorithm name used for above arguments (ex. "sha1") DEFAULT: sha1
     * @since jsrsasign 6.1.0 asn1ocsp 1.0.0
     * @example
     * o = new KJUR.asn1.ocsp.CertID();
     * o.setByCert("-----BEGIN...", "-----BEGIN..."); // sha1 is used by default
     * o.setByCert("-----BEGIN...", "-----BEGIN...", "sha256");
     */
    this.setByCert = function(issuerCert, subjectCert, algName) {
	if (algName === undefined) algName = _DEFAULT_HASH;

	var xSbj = new _X509();
	xSbj.readCertPEM(subjectCert);
	var xIss = new _X509();
	xIss.readCertPEM(issuerCert);

	var hISS_SPKI = xIss.getPublicKeyHex();
	var issuerKeyHex = _ASN1HEX.getTLVbyList(hISS_SPKI, 0, [1, 0], "30");

	var serialNumberHex = xSbj.getSerialNumberHex();
	var issuerNameHashHex = _hashHex(xIss.getSubjectHex(), algName);
	var issuerKeyHashHex = _hashHex(issuerKeyHex, algName);
	this.setByValue(issuerNameHashHex, issuerKeyHashHex,
			serialNumberHex, algName);
	this.hoge = xSbj.getSerialNumberHex();
    };

    this.getEncodedHex = function() {
	if (this.dHashAlg === null && 
	    this.dIssuerNameHash === null &&
	    this.dIssuerKeyHash === null &&
	    this.dSerialNumber === null)
	    throw "not yet set values";

	var a = [this.dHashAlg, this.dIssuerNameHash,
		 this.dIssuerKeyHash, this.dSerialNumber];
	var seq = new _DERSequence({array: a});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
	var p = params;
	if (p.issuerCert !== undefined &&
	    p.subjectCert !== undefined) {
	    var alg = _DEFAULT_HASH;
	    if (p.alg === undefined) alg = undefined;
	    this.setByCert(p.issuerCert, p.subjectCert, alg);
	} else if (p.namehash !== undefined &&
		   p.keyhash !== undefined &&
		   p.serial !== undefined) {
	    var alg = _DEFAULT_HASH;
	    if (p.alg === undefined) alg = undefined;
	    this.setByValue(p.namehash, p.keyhash, p.serial, alg);
	} else {
	    throw "invalid constructor arguments";
	}
    }
};
YAHOO.lang.extend(KJUR.asn1.ocsp.CertID, KJUR.asn1.ASN1Object);

/**
 * ASN.1 Request class for OCSP<br/>
 * @name KJUR.asn1.ocsp.Request
 * @class ASN.1 Request class for OCSP
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 6.1.0 asn1ocsp 1.0.0
 * @description
 * Request ASN.1 class is defined in 
 * <a href="https://tools.ietf.org/html/rfc6960#section-4.1.1">RFC 6960 4.1.1</a>. 
 * singleRequestExtensions is not supported yet in this version such as nonce.
 * <pre>
 * Request ::= SEQUENCE {
 *   reqCert                  CertID,
 *   singleRequestExtensions  [0] EXPLICIT Extensions OPTIONAL }
 * </pre>
 * @example
 * // default constructor
 * o = new KJUR.asn1.ocsp.Request();
 * // constructor with certs (sha1 is used by default)
 * o = new KJUR.asn1.ocsp.Request({issuerCert: "-----BEGIN...", subjectCert: "-----BEGIN..."});
 * // constructor with certs and sha256
 * o = new KJUR.asn1.ocsp.Request({issuerCert: "-----BEGIN...", subjectCert: "-----BEGIN...", alg: "sha256"});
 * // constructor with values
 * o = new KJUR.asn1.ocsp.Request({namehash: "1a...", keyhash: "ad...", serial: "1234", alg: "sha256"});
 */
KJUR.asn1.ocsp.Request = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_KJUR_asn1_ocsp = _KJUR_asn1.ocsp;
    
    _KJUR_asn1_ocsp.Request.superclass.constructor.call(this);
    this.dReqCert = null;
    this.dExt = null;
    
    this.getEncodedHex = function() {
	var a = [];

	// 1. reqCert
	if (this.dReqCert === null)
	    throw "reqCert not set";
	a.push(this.dReqCert);

	// 2. singleRequestExtensions (not supported yet)

	// 3. construct SEQUENCE
	var seq = new _DERSequence({array: a});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (typeof params !== "undefined") {
	var o = new _KJUR_asn1_ocsp.CertID(params);
	this.dReqCert = o;
    }
};
YAHOO.lang.extend(KJUR.asn1.ocsp.Request, KJUR.asn1.ASN1Object);

/**
 * ASN.1 TBSRequest class for OCSP<br/>
 * @name KJUR.asn1.ocsp.TBSRequest
 * @class ASN.1 TBSRequest class for OCSP
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 6.1.0 asn1ocsp 1.0.0
 * @description
 * TBSRequest ASN.1 class is defined in 
 * <a href="https://tools.ietf.org/html/rfc6960#section-4.1.1">RFC 6960 4.1.1</a>. 
 * <pre>
 * TBSRequest ::= SEQUENCE {
 *   version            [0] EXPLICIT Version DEFAULT v1,
 *   requestorName      [1] EXPLICIT GeneralName OPTIONAL,
 *   requestList            SEQUENCE OF Request,
 *   requestExtensions  [2] EXPLICIT Extensions OPTIONAL }
 * </pre>
 * @example
 * // default constructor
 * o = new KJUR.asn1.ocsp.TBSRequest();
 * // constructor with requestList parameter
 * o = new KJUR.asn1.ocsp.TBSRequest({reqList:[
 *   {issuerCert: "-----BEGIN...", subjectCert: "-----BEGIN...", alg:},
 *   {issuerCert: "-----BEGIN...", subjectCert: "-----BEGIN...", alg: "sha256"}
 * ]});
 */
KJUR.asn1.ocsp.TBSRequest = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_KJUR_asn1_ocsp = _KJUR_asn1.ocsp;

    _KJUR_asn1_ocsp.TBSRequest.superclass.constructor.call(this);
    this.version = 0;
    this.dRequestorName = null;
    this.dRequestList = [];
    this.dRequestExt = null;

    /**
     * set TBSRequest ASN.1 object by array of parameters.<br/>
     * @name setRequestListByParam
     * @memberOf KJUR.asn1.ocsp.TBSRequest#
     * @function
     * @param {Array} aParams array of parameters for Request class
     * @since jsrsasign 6.1.0 asn1ocsp 1.0.0
     * @example
     * o = new KJUR.asn1.ocsp.TBSRequest();
     * o.setRequestListByParam([
     *   {issuerCert: "-----BEGIN...", subjectCert: "-----BEGIN...", alg:},
     *   {issuerCert: "-----BEGIN...", subjectCert: "-----BEGIN...", alg: "sha256"}
     * ]);
     */
    this.setRequestListByParam = function(aParams) {
	var a = [];
	for (var i = 0; i < aParams.length; i++) {
	    var dReq = new _KJUR_asn1_ocsp.Request(aParams[0]);
	    a.push(dReq);
	}
	this.dRequestList = a;
    };

    this.getEncodedHex = function() {
	var a = [];

	// 1. version
	if (this.version !== 0)
	    throw "not supported version: " + this.version;

	// 2. requestorName
	if (this.dRequestorName !== null)
	    throw "requestorName not supported";

	// 3. requestList
	var seqRequestList = 
	    new _DERSequence({array: this.dRequestList});
	a.push(seqRequestList);

	// 4. requestExtensions
	if (this.dRequestExt !== null)
	    throw "requestExtensions not supported";

	// 5. construct SEQUENCE
	var seq = new _DERSequence({array: a});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
	if (params.reqList !== undefined)
	    this.setRequestListByParam(params.reqList);
    }
};
YAHOO.lang.extend(KJUR.asn1.ocsp.TBSRequest, KJUR.asn1.ASN1Object);


/**
 * ASN.1 OCSPRequest class for OCSP<br/>
 * @name KJUR.asn1.ocsp.OCSPRequest
 * @class ASN.1 OCSPRequest class for OCSP
 * @param {Array} params associative array of parameters
 * @extends KJUR.asn1.ASN1Object
 * @since jsrsasign 6.1.0 asn1ocsp 1.0.0
 * @description
 * OCSPRequest ASN.1 class is defined in 
 * <a href="https://tools.ietf.org/html/rfc6960#section-4.1.1">RFC 6960 4.1.1</a>. 
 * A signed request is not supported yet in this version.
 * <pre>
 * OCSPRequest ::= SEQUENCE {
 *   tbsRequest             TBSRequest,
 *   optionalSignature  [0] EXPLICIT Signature OPTIONAL }
 * </pre>
 * @example
 * // default constructor
 * o = new KJUR.asn1.ocsp.OCSPRequest();
 * // constructor with requestList parameter
 * o = new KJUR.asn1.ocsp.OCSPRequest({reqList:[
 *   {issuerCert: "-----BEGIN...", subjectCert: "-----BEGIN...", alg:},
 *   {issuerCert: "-----BEGIN...", subjectCert: "-----BEGIN...", alg: "sha256"}
 * ]});
 */
KJUR.asn1.ocsp.OCSPRequest = function(params) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERSequence = _KJUR_asn1.DERSequence,
	_KJUR_asn1_ocsp = _KJUR_asn1.ocsp;

    _KJUR_asn1_ocsp.OCSPRequest.superclass.constructor.call(this);
    this.dTbsRequest = null;
    this.dOptionalSignature = null;

    this.getEncodedHex = function() {
	var a = [];

	// 1. tbsRequest
	if (this.dTbsRequest !== null) {
	    a.push(this.dTbsRequest);
	} else {
	    throw "tbsRequest not set";
	}

	// 2. optionalSignature
	if (this.dOptionalSignature !== null)
	    throw "optionalSignature not supported";

	// 3. construct SEQUENCE
	var seq = new _DERSequence({array: a});
        this.hTLV = seq.getEncodedHex();
        return this.hTLV;
    };

    if (params !== undefined) {
	if (params.reqList !== undefined) {
	    var o = new _KJUR_asn1_ocsp.TBSRequest(params);
	    this.dTbsRequest = o;
	}
    }
};
YAHOO.lang.extend(KJUR.asn1.ocsp.OCSPRequest, KJUR.asn1.ASN1Object);

/**
 * Utility class for OCSP<br/>
 * @name KJUR.asn1.ocsp.OCSPUtil
 * @class Utility class for OCSP
 * @since jsrsasign 6.1.0 asn1ocsp 1.0.0
 * @description
 * This class provides utility static methods for OCSP.
 * <ul>
 * <li>{@link KJUR.asn1.ocsp.OCSPUtil.getRequestHex} - generates hexadecimal string of OCSP request</li>
 * </ul>
 */
KJUR.asn1.ocsp.OCSPUtil = {};

/**
 * generates hexadecimal string of OCSP request<br/>
 * @name getRequestHex
 * @memberOf KJUR.asn1.ocsp.OCSPUtil
 * @function
 * @param {String} issuerCert string of PEM issuer certificate
 * @param {String} subjectCert string of PEM subject certificate to be verified by OCSP
 * @param {String} algName hash algorithm name used for above arguments (ex. "sha1") DEFAULT: sha1
 * @return {String} hexadecimal string of generated OCSP request
 * @since jsrsasign 6.1.0 asn1ocsp 1.0.0
 * @description
 * This static method generates hexadecimal string of OCSP request.
 * @example
 * // generate OCSP request using sha1 algorithnm by default.
 * hReq = KJUR.asn1.ocsp.OCSPUtil.getRequestHex("-----BEGIN...", "-----BEGIN...");
 */
KJUR.asn1.ocsp.OCSPUtil.getRequestHex = function(issuerCert, subjectCert, alg) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_KJUR_asn1_ocsp = _KJUR_asn1.ocsp;

    if (alg === undefined) alg = _KJUR_asn1_ocsp.DEFAULT_HASH;
    var param = {alg: alg, issuerCert: issuerCert, subjectCert: subjectCert};
    var o = new _KJUR_asn1_ocsp.OCSPRequest({reqList: [param]});
    return o.getEncodedHex();
};

/**
 * parse OCSPResponse<br/>
 * @name getOCSPResponseInfo
 * @memberOf KJUR.asn1.ocsp.OCSPUtil
 * @function
 * @param {String} h hexadecimal string of DER OCSPResponse
 * @return {Object} JSON object of parsed OCSPResponse
 * @since jsrsasign 6.1.0 asn1ocsp 1.0.1
 * @description
 * This static method parse a hexadecimal string of DER OCSPResponse and
 * returns JSON object of its parsed result.
 * Its result has following properties:
 * <ul>
 * <li>responseStatus - integer of responseStatus</li>
 * <li>certStatus - string of certStatus (ex. good, revoked or unknown)</li>
 * <li>thisUpdate - string of thisUpdate in Zulu(ex. 20151231235959Z)</li>
 * <li>nextUpdate - string of nextUpdate in Zulu(ex. 20151231235959Z)</li>
 * </ul>
 * @example
 * info = KJUR.asn1.ocsp.OCSPUtil.getOCSPResponseInfo("3082...");
 */
KJUR.asn1.ocsp.OCSPUtil.getOCSPResponseInfo = function(h) {
    var _ASN1HEX = ASN1HEX;
    var _getVbyList = _ASN1HEX.getVbyList;
    var _getIdxbyList = _ASN1HEX.getIdxbyList;
    var _getVbyList = _ASN1HEX.getVbyList;
    var _getV = _ASN1HEX.getV;

    var result = {};
    try {
	var v = _getVbyList(h, 0, [0], "0a");
	result.responseStatus = parseInt(v, 16);
    } catch(ex) {};
    if (result.responseStatus !== 0) return result;

    try {
	// certStatus
	var idxCertStatus = _getIdxbyList(h, 0, [1,0,1,0,0,2,0,1]);
	if (h.substr(idxCertStatus, 2) === "80") {
	    result.certStatus = "good";
	} else if (h.substr(idxCertStatus, 2) === "a1") {
	    result.certStatus = "revoked";
	    result.revocationTime = 
		hextoutf8(_getVbyList(h, idxCertStatus, [0]));
	} else if (h.substr(idxCertStatus, 2) === "82") {
	    result.certStatus = "unknown";
	}
    } catch (ex) {};

    // thisUpdate
    try {
	var idxThisUpdate = _getIdxbyList(h, 0, [1,0,1,0,0,2,0,2]);
	result.thisUpdate = hextoutf8(_getV(h, idxThisUpdate));
    } catch (ex) {};

    // nextUpdate
    try {
	var idxEncapNextUpdate = _getIdxbyList(h, 0, [1,0,1,0,0,2,0,3]);
	if (h.substr(idxEncapNextUpdate, 2) === "a0") {
	    result.nextUpdate = 
		hextoutf8(_getVbyList(h, idxEncapNextUpdate, [0]));
	}
    } catch (ex) {};

    return result;
};

/* base64x-1.1.14 (c) 2012-2018 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * base64x.js - Base64url and supplementary functions for Tom Wu's base64.js library
 *
 * version: 1.1.14 (2018-Apr-21)
 *
 * Copyright (c) 2012-2018 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name base64x-1.1.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version jsrsasign 8.0.12 base64x 1.1.14 (2018-Apr-22)
 * @since jsrsasign 2.1
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

var KJUR;
if (typeof KJUR == "undefined" || !KJUR) KJUR = {};
if (typeof KJUR.lang == "undefined" || !KJUR.lang) KJUR.lang = {};

/**
 * String and its utility class <br/>
 * This class provides some static utility methods for string.
 * @class String and its utility class
 * @author Kenji Urushima
 * @version 1.0 (2016-Aug-05)
 * @since base64x 1.1.7 jsrsasign 5.0.13
 * @description
 * <br/>
 * This class provides static methods for string utility.
 * <dl>
 * <dt><b>STRING TYPE CHECKERS</b>
 * <dd>
 * <ul>
 * <li>{@link KJUR.lang.String.isInteger} - check whether argument is an integer</li>
 * <li>{@link KJUR.lang.String.isHex} - check whether argument is a hexadecimal string</li>
 * <li>{@link KJUR.lang.String.isBase64} - check whether argument is a Base64 encoded string</li>
 * <li>{@link KJUR.lang.String.isBase64URL} - check whether argument is a Base64URL encoded string</li>
 * <li>{@link KJUR.lang.String.isIntegerArray} - check whether argument is an array of integers</li>
 * </ul>
 * </dl>
 */
KJUR.lang.String = function() {};

/**
 * Base64URL and supplementary functions for Tom Wu's base64.js library.<br/>
 * This class is just provide information about global functions
 * defined in 'base64x.js'. The 'base64x.js' script file provides
 * global functions for converting following data each other.
 * <ul>
 * <li>(ASCII) String</li>
 * <li>UTF8 String including CJK, Latin and other characters</li>
 * <li>byte array</li>
 * <li>hexadecimal encoded String</li>
 * <li>Full URIComponent encoded String (such like "%69%94")</li>
 * <li>Base64 encoded String</li>
 * <li>Base64URL encoded String</li>
 * </ul>
 * All functions in 'base64x.js' are defined in {@link _global_} and not
 * in this class.
 * 
 * @class Base64URL and supplementary functions for Tom Wu's base64.js library
 * @author Kenji Urushima
 * @version 1.1 (07 May 2012)
 * @requires base64.js
 * @see <a href="https://kjur.github.io/jsjws/">'jwjws'(JWS JavaScript Library) home page https://kjur.github.io/jsjws/</a>
 * @see <a href="https://kjur.github.io/jsrsasigns/">'jwrsasign'(RSA Sign JavaScript Library) home page https://kjur.github.io/jsrsasign/</a>
 */
function Base64x() {
}

// ==== string / byte array ================================
/**
 * convert a string to an array of character codes
 * @name stoBA
 * @function
 * @param {String} s
 * @return {Array of Numbers} 
 */
function stoBA(s) {
    var a = new Array();
    for (var i = 0; i < s.length; i++) {
	a[i] = s.charCodeAt(i);
    }
    return a;
}

/**
 * convert an array of character codes to a string
 * @name BAtos
 * @function
 * @param {Array of Numbers} a array of character codes
 * @return {String} s
 */
function BAtos(a) {
    var s = "";
    for (var i = 0; i < a.length; i++) {
	s = s + String.fromCharCode(a[i]);
    }
    return s;
}

// ==== byte array / hex ================================
/**
 * convert an array of bytes(Number) to hexadecimal string.<br/>
 * @name BAtohex
 * @function
 * @param {Array of Numbers} a array of bytes
 * @return {String} hexadecimal string
 */
function BAtohex(a) {
    var s = "";
    for (var i = 0; i < a.length; i++) {
	var hex1 = a[i].toString(16);
	if (hex1.length == 1) hex1 = "0" + hex1;
	s = s + hex1;
    }
    return s;
}

// ==== string / hex ================================
/**
 * convert a ASCII string to a hexadecimal string of ASCII codes.<br/>
 * NOTE: This can't be used for non ASCII characters.
 * @name stohex
 * @function
 * @param {s} s ASCII string
 * @return {String} hexadecimal string
 */
function stohex(s) {
    return BAtohex(stoBA(s));
}

// ==== string / base64 ================================
/**
 * convert a ASCII string to a Base64 encoded string.<br/>
 * NOTE: This can't be used for non ASCII characters.
 * @name stob64
 * @function
 * @param {s} s ASCII string
 * @return {String} Base64 encoded string
 */
function stob64(s) {
    return hex2b64(stohex(s));
}

// ==== string / base64url ================================
/**
 * convert a ASCII string to a Base64URL encoded string.<br/>
 * NOTE: This can't be used for non ASCII characters.
 * @name stob64u
 * @function
 * @param {s} s ASCII string
 * @return {String} Base64URL encoded string
 */
function stob64u(s) {
    return b64tob64u(hex2b64(stohex(s)));
}

/**
 * convert a Base64URL encoded string to a ASCII string.<br/>
 * NOTE: This can't be used for Base64URL encoded non ASCII characters.
 * @name b64utos
 * @function
 * @param {s} s Base64URL encoded string
 * @return {String} ASCII string
 */
function b64utos(s) {
    return BAtos(b64toBA(b64utob64(s)));
}

// ==== base64 / base64url ================================
/**
 * convert a Base64 encoded string to a Base64URL encoded string.<br/>
 * @name b64tob64u
 * @function
 * @param {String} s Base64 encoded string
 * @return {String} Base64URL encoded string
 * @example
 * b64tob64u("ab+c3f/==") &rarr; "ab-c3f_"
 */
function b64tob64u(s) {
    s = s.replace(/\=/g, "");
    s = s.replace(/\+/g, "-");
    s = s.replace(/\//g, "_");
    return s;
}

/**
 * convert a Base64URL encoded string to a Base64 encoded string.<br/>
 * @name b64utob64
 * @function
 * @param {String} s Base64URL encoded string
 * @return {String} Base64 encoded string
 * @example
 * b64utob64("ab-c3f_") &rarr; "ab+c3f/=="
 */
function b64utob64(s) {
    if (s.length % 4 == 2) s = s + "==";
    else if (s.length % 4 == 3) s = s + "=";
    s = s.replace(/-/g, "+");
    s = s.replace(/_/g, "/");
    return s;
}

// ==== hex / base64url ================================
/**
 * convert a hexadecimal string to a Base64URL encoded string.<br/>
 * @name hextob64u
 * @function
 * @param {String} s hexadecimal string
 * @return {String} Base64URL encoded string
 * @description
 * convert a hexadecimal string to a Base64URL encoded string.
 * NOTE: If leading "0" is omitted and odd number length for
 * hexadecimal leading "0" is automatically added.
 */
function hextob64u(s) {
    if (s.length % 2 == 1) s = "0" + s;
    return b64tob64u(hex2b64(s));
}

/**
 * convert a Base64URL encoded string to a hexadecimal string.<br/>
 * @name b64utohex
 * @function
 * @param {String} s Base64URL encoded string
 * @return {String} hexadecimal string
 */
function b64utohex(s) {
    return b64tohex(b64utob64(s));
}

// ==== utf8 / base64url ================================

/**
 * convert a UTF-8 encoded string including CJK or Latin to a Base64URL encoded string.<br/>
 * @name utf8tob64u
 * @function
 * @param {String} s UTF-8 encoded string
 * @return {String} Base64URL encoded string
 * @since 1.1
 */

/**
 * convert a Base64URL encoded string to a UTF-8 encoded string including CJK or Latin.<br/>
 * @name b64utoutf8
 * @function
 * @param {String} s Base64URL encoded string
 * @return {String} UTF-8 encoded string
 * @since 1.1
 */

var utf8tob64u, b64utoutf8;

if (typeof Buffer === 'function') {
  utf8tob64u = function (s) {
    return b64tob64u(new Buffer(s, 'utf8').toString('base64'));
  };

  b64utoutf8 = function (s) {
    return new Buffer(b64utob64(s), 'base64').toString('utf8');
  };
} else {
  utf8tob64u = function (s) {
    return hextob64u(uricmptohex(encodeURIComponentAll(s)));
  };

  b64utoutf8 = function (s) {
    return decodeURIComponent(hextouricmp(b64utohex(s)));
  };
}

// ==== utf8 / base64url ================================
/**
 * convert a UTF-8 encoded string including CJK or Latin to a Base64 encoded string.<br/>
 * @name utf8tob64
 * @function
 * @param {String} s UTF-8 encoded string
 * @return {String} Base64 encoded string
 * @since 1.1.1
 */
function utf8tob64(s) {
  return hex2b64(uricmptohex(encodeURIComponentAll(s)));
}

/**
 * convert a Base64 encoded string to a UTF-8 encoded string including CJK or Latin.<br/>
 * @name b64toutf8
 * @function
 * @param {String} s Base64 encoded string
 * @return {String} UTF-8 encoded string
 * @since 1.1.1
 */
function b64toutf8(s) {
  return decodeURIComponent(hextouricmp(b64tohex(s)));
}

// ==== utf8 / hex ================================
/**
 * convert a UTF-8 encoded string including CJK or Latin to a hexadecimal encoded string.<br/>
 * @name utf8tohex
 * @function
 * @param {String} s UTF-8 encoded string
 * @return {String} hexadecimal encoded string
 * @since 1.1.1
 */
function utf8tohex(s) {
  return uricmptohex(encodeURIComponentAll(s));
}

/**
 * convert a hexadecimal encoded string to a UTF-8 encoded string including CJK or Latin.<br/>
 * Note that when input is improper hexadecimal string as UTF-8 string, this function returns
 * 'null'.
 * @name hextoutf8
 * @function
 * @param {String} s hexadecimal encoded string
 * @return {String} UTF-8 encoded string or null
 * @since 1.1.1
 */
function hextoutf8(s) {
  return decodeURIComponent(hextouricmp(s));
}

/**
 * convert a hexadecimal encoded string to raw string including non printable characters.<br/>
 * @name hextorstr
 * @function
 * @param {String} s hexadecimal encoded string
 * @return {String} raw string
 * @since 1.1.2
 * @example
 * hextorstr("610061") &rarr; "a\x00a"
 */
function hextorstr(sHex) {
    var s = "";
    for (var i = 0; i < sHex.length - 1; i += 2) {
        s += String.fromCharCode(parseInt(sHex.substr(i, 2), 16));
    }
    return s;
}

/**
 * convert a raw string including non printable characters to hexadecimal encoded string.<br/>
 * @name rstrtohex
 * @function
 * @param {String} s raw string
 * @return {String} hexadecimal encoded string
 * @since 1.1.2
 * @example
 * rstrtohex("a\x00a") &rarr; "610061"
 */
function rstrtohex(s) {
    var result = "";
    for (var i = 0; i < s.length; i++) {
        result += ("0" + s.charCodeAt(i).toString(16)).slice(-2);
    }
    return result;
}

// ==== hex / b64nl =======================================

/**
 * convert a hexadecimal string to Base64 encoded string<br/>
 * @name hextob64
 * @function
 * @param {String} s hexadecimal string
 * @return {String} resulted Base64 encoded string
 * @since base64x 1.1.3
 * @description
 * This function converts from a hexadecimal string to Base64 encoded
 * string without new lines.
 * @example
 * hextob64("616161") &rarr; "YWFh"
 */
function hextob64(s) {
    return hex2b64(s);
}

/**
 * convert a hexadecimal string to Base64 encoded string with new lines<br/>
 * @name hextob64nl
 * @function
 * @param {String} s hexadecimal string
 * @return {String} resulted Base64 encoded string with new lines
 * @since base64x 1.1.3
 * @description
 * This function converts from a hexadecimal string to Base64 encoded
 * string with new lines for each 64 characters. This is useful for
 * PEM encoded file.
 * @example
 * hextob64nl("123456789012345678901234567890123456789012345678901234567890")
 * &rarr;
 * MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4 // new line
 * OTAxMjM0NTY3ODkwCg==
 */
function hextob64nl(s) {
    var b64 = hextob64(s);
    var b64nl = b64.replace(/(.{64})/g, "$1\r\n");
    b64nl = b64nl.replace(/\r\n$/, '');
    return b64nl;
}

/**
 * convert a Base64 encoded string with new lines to a hexadecimal string<br/>
 * @name b64nltohex
 * @function
 * @param {String} s Base64 encoded string with new lines
 * @return {String} hexadecimal string
 * @since base64x 1.1.3
 * @description
 * This function converts from a Base64 encoded
 * string with new lines to a hexadecimal string.
 * This is useful to handle PEM encoded file.
 * This function removes any non-Base64 characters (i.e. not 0-9,A-Z,a-z,\,+,=)
 * including new line.
 * @example
 * hextob64nl(
 * "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4\r\n" +
 * "OTAxMjM0NTY3ODkwCg==\r\n")
 * &rarr;
 * "123456789012345678901234567890123456789012345678901234567890"
 */
function b64nltohex(s) {
    var b64 = s.replace(/[^0-9A-Za-z\/+=]*/g, '');
    var hex = b64tohex(b64);
    return hex;
} 

// ==== hex / pem =========================================

/**
 * get PEM string from hexadecimal data and header string
 * @name hextopem
 * @function
 * @param {String} dataHex hexadecimal string of PEM body
 * @param {String} pemHeader PEM header string (ex. 'RSA PRIVATE KEY')
 * @return {String} PEM formatted string of input data
 * @since jsrasign 7.2.1 base64x 1.1.12
 * @description
 * This function converts a hexadecimal string to a PEM string with
 * a specified header. Its line break will be CRLF("\r\n").
 * @example
 * hextopem('616161', 'RSA PRIVATE KEY') &rarr;
 * -----BEGIN PRIVATE KEY-----
 * YWFh
 * -----END PRIVATE KEY-----
 */
function hextopem(dataHex, pemHeader) {
    var pemBody = hextob64nl(dataHex);
    return "-----BEGIN " + pemHeader + "-----\r\n" + 
        pemBody + 
        "\r\n-----END " + pemHeader + "-----\r\n";
}

/**
 * get hexacedimal string from PEM format data<br/>
 * @name pemtohex
 * @function
 * @param {String} s PEM formatted string
 * @param {String} sHead PEM header string without BEGIN/END(OPTION)
 * @return {String} hexadecimal string data of PEM contents
 * @since jsrsasign 7.2.1 base64x 1.1.12
 * @description
 * This static method gets a hexacedimal string of contents 
 * from PEM format data. You can explicitly specify PEM header 
 * by sHead argument. 
 * Any space characters such as white space or new line
 * will be omitted.<br/>
 * NOTE: Now {@link KEYUTIL.getHexFromPEM} and {@link X509.pemToHex}
 * have been deprecated since jsrsasign 7.2.1. 
 * Please use this method instead.
 * @example
 * pemtohex("-----BEGIN PUBLIC KEY...") &rarr; "3082..."
 * pemtohex("-----BEGIN CERTIFICATE...", "CERTIFICATE") &rarr; "3082..."
 * pemtohex(" \r\n-----BEGIN DSA PRIVATE KEY...") &rarr; "3082..."
 */
function pemtohex(s, sHead) {
    if (s.indexOf("-----BEGIN ") == -1)
        throw "can't find PEM header: " + sHead;

    if (sHead !== undefined) {
        s = s.replace("-----BEGIN " + sHead + "-----", "");
        s = s.replace("-----END " + sHead + "-----", "");
    } else {
        s = s.replace(/-----BEGIN [^-]+-----/, '');
        s = s.replace(/-----END [^-]+-----/, '');
    }
    return b64nltohex(s);
}

// ==== hex / ArrayBuffer =================================

/**
 * convert a hexadecimal string to an ArrayBuffer<br/>
 * @name hextoArrayBuffer
 * @function
 * @param {String} hex hexadecimal string
 * @return {ArrayBuffer} ArrayBuffer
 * @since jsrsasign 6.1.4 base64x 1.1.8
 * @description
 * This function converts from a hexadecimal string to an ArrayBuffer.
 * @example
 * hextoArrayBuffer("fffa01") &rarr; ArrayBuffer of [255, 250, 1]
 */
function hextoArrayBuffer(hex) {
    if (hex.length % 2 != 0) throw "input is not even length";
    if (hex.match(/^[0-9A-Fa-f]+$/) == null) throw "input is not hexadecimal";

    var buffer = new ArrayBuffer(hex.length / 2);
    var view = new DataView(buffer);

    for (var i = 0; i < hex.length / 2; i++) {
	view.setUint8(i, parseInt(hex.substr(i * 2, 2), 16));
    }

    return buffer;
}

// ==== ArrayBuffer / hex =================================

/**
 * convert an ArrayBuffer to a hexadecimal string<br/>
 * @name ArrayBuffertohex
 * @function
 * @param {ArrayBuffer} buffer ArrayBuffer
 * @return {String} hexadecimal string
 * @since jsrsasign 6.1.4 base64x 1.1.8
 * @description
 * This function converts from an ArrayBuffer to a hexadecimal string.
 * @example
 * var buffer = new ArrayBuffer(3);
 * var view = new DataView(buffer);
 * view.setUint8(0, 0xfa);
 * view.setUint8(1, 0xfb);
 * view.setUint8(2, 0x01);
 * ArrayBuffertohex(buffer) &rarr; "fafb01"
 */
function ArrayBuffertohex(buffer) {
    var hex = "";
    var view = new DataView(buffer);

    for (var i = 0; i < buffer.byteLength; i++) {
	hex += ("00" + view.getUint8(i).toString(16)).slice(-2);
    }

    return hex;
}

// ==== zulu / int =================================
/**
 * GeneralizedTime or UTCTime string to milliseconds from Unix origin<br>
 * @name zulutomsec
 * @function
 * @param {String} s GeneralizedTime or UTCTime string (ex. 20170412235959.384Z)
 * @return {Number} milliseconds from Unix origin time (i.e. Jan 1, 1970 0:00:00 UTC)
 * @since jsrsasign 7.1.3 base64x 1.1.9
 * @description
 * This function converts from GeneralizedTime string (i.e. YYYYMMDDHHmmSSZ) or
 * UTCTime string (i.e. YYMMDDHHmmSSZ) to milliseconds from Unix origin time
 * (i.e. Jan 1 1970 0:00:00 UTC). 
 * Argument string may have fraction of seconds and
 * its length is one or more digits such as "20170410235959.1234567Z".
 * As for UTCTime, if year "YY" is equal or less than 49 then it is 20YY.
 * If year "YY" is equal or greater than 50 then it is 19YY.
 * @example
 * zulutomsec(  "071231235959Z")       &rarr; 1199145599000 #Mon, 31 Dec 2007 23:59:59 GMT
 * zulutomsec(  "071231235959.1Z")     &rarr; 1199145599100 #Mon, 31 Dec 2007 23:59:59 GMT
 * zulutomsec(  "071231235959.12345Z") &rarr; 1199145599123 #Mon, 31 Dec 2007 23:59:59 GMT
 * zulutomsec("20071231235959Z")       &rarr; 1199145599000 #Mon, 31 Dec 2007 23:59:59 GMT
 * zulutomsec(  "931231235959Z")       &rarr; -410227201000 #Mon, 31 Dec 1956 23:59:59 GMT
 */
function zulutomsec(s) {
    var year, month, day, hour, min, sec, msec, d;
    var sYear, sFrac, sMsec, matchResult;

    matchResult = s.match(/^(\d{2}|\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(|\.\d+)Z$/);

    if (matchResult) {
        sYear = matchResult[1];
	year = parseInt(sYear);
        if (sYear.length === 2) {
	    if (50 <= year && year < 100) {
		year = 1900 + year;
	    } else if (0 <= year && year < 50) {
		year = 2000 + year;
	    }
	}
	month = parseInt(matchResult[2]) - 1;
	day = parseInt(matchResult[3]);
	hour = parseInt(matchResult[4]);
	min = parseInt(matchResult[5]);
	sec = parseInt(matchResult[6]);
	msec = 0;

	sFrac = matchResult[7];
	if (sFrac !== "") {
	    sMsec = (sFrac.substr(1) + "00").substr(0, 3); // .12 -> 012
	    msec = parseInt(sMsec);
	}
	return Date.UTC(year, month, day, hour, min, sec, msec);
    }
    throw "unsupported zulu format: " + s;
}

/**
 * GeneralizedTime or UTCTime string to seconds from Unix origin<br>
 * @name zulutosec
 * @function
 * @param {String} s GeneralizedTime or UTCTime string (ex. 20170412235959.384Z)
 * @return {Number} seconds from Unix origin time (i.e. Jan 1, 1970 0:00:00 UTC)
 * @since jsrsasign 7.1.3 base64x 1.1.9
 * @description
 * This function converts from GeneralizedTime string (i.e. YYYYMMDDHHmmSSZ) or
 * UTCTime string (i.e. YYMMDDHHmmSSZ) to seconds from Unix origin time
 * (i.e. Jan 1 1970 0:00:00 UTC). Argument string may have fraction of seconds 
 * however result value will be omitted.
 * As for UTCTime, if year "YY" is equal or less than 49 then it is 20YY.
 * If year "YY" is equal or greater than 50 then it is 19YY.
 * @example
 * zulutosec(  "071231235959Z")       &rarr; 1199145599 #Mon, 31 Dec 2007 23:59:59 GMT
 * zulutosec(  "071231235959.1Z")     &rarr; 1199145599 #Mon, 31 Dec 2007 23:59:59 GMT
 * zulutosec("20071231235959Z")       &rarr; 1199145599 #Mon, 31 Dec 2007 23:59:59 GMT
 */
function zulutosec(s) {
    var msec = zulutomsec(s);
    return ~~(msec / 1000);
}

// ==== zulu / Date =================================

/**
 * GeneralizedTime or UTCTime string to Date object<br>
 * @name zulutodate
 * @function
 * @param {String} s GeneralizedTime or UTCTime string (ex. 20170412235959.384Z)
 * @return {Date} Date object for specified time
 * @since jsrsasign 7.1.3 base64x 1.1.9
 * @description
 * This function converts from GeneralizedTime string (i.e. YYYYMMDDHHmmSSZ) or
 * UTCTime string (i.e. YYMMDDHHmmSSZ) to Date object.
 * Argument string may have fraction of seconds and
 * its length is one or more digits such as "20170410235959.1234567Z".
 * As for UTCTime, if year "YY" is equal or less than 49 then it is 20YY.
 * If year "YY" is equal or greater than 50 then it is 19YY.
 * @example
 * zulutodate(  "071231235959Z").toUTCString()   &rarr; "Mon, 31 Dec 2007 23:59:59 GMT"
 * zulutodate(  "071231235959.1Z").toUTCString() &rarr; "Mon, 31 Dec 2007 23:59:59 GMT"
 * zulutodate("20071231235959Z").toUTCString()   &rarr; "Mon, 31 Dec 2007 23:59:59 GMT"
 * zulutodate(  "071231235959.34").getMilliseconds() &rarr; 340
 */
function zulutodate(s) {
    return new Date(zulutomsec(s));
}

// ==== Date / zulu =================================

/**
 * Date object to zulu time string<br>
 * @name datetozulu
 * @function
 * @param {Date} d Date object for specified time
 * @param {Boolean} flagUTCTime if this is true year will be YY otherwise YYYY
 * @param {Boolean} flagMilli if this is true result concludes milliseconds
 * @return {String} GeneralizedTime or UTCTime string (ex. 20170412235959.384Z)
 * @since jsrsasign 7.2.0 base64x 1.1.11
 * @description
 * This function converts from Date object to GeneralizedTime string (i.e. YYYYMMDDHHmmSSZ) or
 * UTCTime string (i.e. YYMMDDHHmmSSZ).
 * As for UTCTime, if year "YY" is equal or less than 49 then it is 20YY.
 * If year "YY" is equal or greater than 50 then it is 19YY.
 * If flagMilli is true its result concludes milliseconds such like
 * "20170520235959.42Z". 
 * @example
 * d = new Date(Date.UTC(2017,4,20,23,59,59,670));
 * datetozulu(d) &rarr; "20170520235959Z"
 * datetozulu(d, true) &rarr; "170520235959Z"
 * datetozulu(d, false, true) &rarr; "20170520235959.67Z"
 */
function datetozulu(d, flagUTCTime, flagMilli) {
    var s;
    var year = d.getUTCFullYear();
    if (flagUTCTime) {
	if (year < 1950 || 2049 < year) 
	    throw "not proper year for UTCTime: " + year;
	s = ("" + year).slice(-2);
    } else {
	s = ("000" + year).slice(-4);
    }
    s += ("0" + (d.getUTCMonth() + 1)).slice(-2);
    s += ("0" + d.getUTCDate()).slice(-2);
    s += ("0" + d.getUTCHours()).slice(-2);
    s += ("0" + d.getUTCMinutes()).slice(-2);
    s += ("0" + d.getUTCSeconds()).slice(-2);
    if (flagMilli) {
	var milli = d.getUTCMilliseconds();
	if (milli !== 0) {
	    milli = ("00" + milli).slice(-3);
	    milli = milli.replace(/0+$/g, "");
	    s += "." + milli;
	}
    }
    s += "Z";
    return s;
}

// ==== URIComponent / hex ================================
/**
 * convert a URLComponent string such like "%67%68" to a hexadecimal string.<br/>
 * @name uricmptohex
 * @function
 * @param {String} s URIComponent string such like "%67%68"
 * @return {String} hexadecimal string
 * @since 1.1
 */
function uricmptohex(s) {
  return s.replace(/%/g, "");
}

/**
 * convert a hexadecimal string to a URLComponent string such like "%67%68".<br/>
 * @name hextouricmp
 * @function
 * @param {String} s hexadecimal string
 * @return {String} URIComponent string such like "%67%68"
 * @since 1.1
 */
function hextouricmp(s) {
  return s.replace(/(..)/g, "%$1");
}

// ==== hex / ipv6 =================================

/**
 * convert any IPv6 address to a 16 byte hexadecimal string
 * @function
 * @param s string of IPv6 address
 * @return {String} 16 byte hexadecimal string of IPv6 address
 * @description
 * This function converts any IPv6 address representation string
 * to a 16 byte hexadecimal string of address.
 * @example
 * 
 */
function ipv6tohex(s) {
  var msgMalformedAddress = "malformed IPv6 address";
  if (! s.match(/^[0-9A-Fa-f:]+$/))
    throw msgMalformedAddress;

  // 1. downcase
  s = s.toLowerCase();

  // 2. expand ::
  var num_colon = s.split(':').length - 1;
  if (num_colon < 2) throw msgMalformedAddress;
  var colon_replacer = ':'.repeat(7 - num_colon + 2);
  s = s.replace('::', colon_replacer);

  // 3. fill zero
  var a = s.split(':');
  if (a.length != 8) throw msgMalformedAddress;
  for (var i = 0; i < 8; i++) {
    a[i] = ("0000" + a[i]).slice(-4);
  }
  return a.join('');
}

/**
 * convert a 16 byte hexadecimal string to RFC 5952 canonicalized IPv6 address<br/>
 * @name hextoipv6
 * @function
 * @param {String} s hexadecimal string of 16 byte IPv6 address
 * @return {String} IPv6 address string canonicalized by RFC 5952
 * @since jsrsasign 8.0.10 base64x 1.1.13
 * @description
 * This function converts a 16 byte hexadecimal string to 
 * <a href="https://tools.ietf.org/html/rfc5952">RFC 5952</a>
 * canonicalized IPv6 address string.
 * @example
 * hextoip("871020010db8000000000000000000000004") &rarr "2001:db8::4"
 * hextoip("871020010db8000000000000000000") &rarr raise exception
 * hextoip("xyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyz") &rarr raise exception
 */
function hextoipv6(s) {
  if (! s.match(/^[0-9A-Fa-f]{32}$/))
    throw "malformed IPv6 address octet";

  // 1. downcase
  s = s.toLowerCase();

  // 2. split 4
  var a = s.match(/.{1,4}/g);

  // 3. trim leading 0
  for (var i = 0; i < 8; i++) {
    a[i] = a[i].replace(/^0+/, "");
    if (a[i] == '') a[i] = '0';
  }
  s = ":" + a.join(":") + ":";

  // 4. find shrinkables :0:0:...
  var aZero = s.match(/:(0:){2,}/g);

  // 5. no shrinkable
  if (aZero === null) return s.slice(1, -1);

  // 6. find max length :0:0:...
  var item = '';
  for (var i = 0; i < aZero.length; i++) {
    if (aZero[i].length > item.length) item = aZero[i];
  }

  // 7. shrink
  s = s.replace(item, '::');
  return s.slice(1, -1);
}

// ==== hex / ip =================================

/**
 * convert a hexadecimal string to IP addresss<br/>
 * @name hextoip
 * @function
 * @param {String} s hexadecimal string of IP address
 * @return {String} IP address string
 * @since jsrsasign 8.0.10 base64x 1.1.13
 * @description
 * This function converts a hexadecimal string of IPv4 or 
 * IPv6 address to IPv4 or IPv6 address string.
 * If byte length is not 4 nor 16, this returns a
 * hexadecimal string without conversion.
 * @see {@link hextoipv6}
 * @example
 * hextoip("c0a80101") &rarr "192.168.1.1"
 * hextoip("871020010db8000000000000000000000004") &rarr "2001:db8::4"
 * hextoip("c0a801010203") &rarr "c0a801010203" // 6 bytes
 * hextoip("zzz")) &rarr raise exception because of not hexadecimal
 */
function hextoip(s) {
  var malformedMsg = "malformed hex value";
  if (! s.match(/^([0-9A-Fa-f][0-9A-Fa-f]){1,}$/))
    throw malformedMsg;
  if (s.length == 8) { // ipv4
    var ip;
    try {
      ip = parseInt(s.substr(0, 2), 16) + "." +
           parseInt(s.substr(2, 2), 16) + "." +
           parseInt(s.substr(4, 2), 16) + "." +
           parseInt(s.substr(6, 2), 16);
      return ip;
    } catch (ex) {
      throw malformedMsg;
    }
  } else if (s.length == 32) {
    return hextoipv6(s);
  } else {
    return s;
  }
}

/**
 * convert IPv4/v6 addresss to a hexadecimal string<br/>
 * @name iptohex
 * @function
 * @param {String} s IPv4/v6 address string
 * @return {String} hexadecimal string of IP address
 * @since jsrsasign 8.0.12 base64x 1.1.14
 * @description
 * This function converts IPv4 or IPv6 address string to
 * a hexadecimal string of IPv4 or IPv6 address.
 * @example
 * iptohex("192.168.1.1") &rarr "c0a80101"
 * iptohex("2001:db8::4") &rarr "871020010db8000000000000000000000004"
 * iptohex("zzz")) &rarr raise exception
 */
function iptohex(s) {
  var malformedMsg = "malformed IP address";
  s = s.toLowerCase(s);

  if (s.match(/^[0-9.]+$/)) {
    var a = s.split(".");
    if (a.length !== 4) throw malformedMsg;
    var hex = "";
    try {
      for (var i = 0; i < 4; i++) {
        var d = parseInt(a[i]);
        hex += ("0" + d.toString(16)).slice(-2);
      }
      return hex;
    } catch(ex) {
      throw malformedMsg;
    }
  } else if (s.match(/^[0-9a-f:]+$/) && s.indexOf(":") !== -1) {
    return ipv6tohex(s);
  } else {
    throw malformedMsg;
  }
}

// ==== URIComponent ================================
/**
 * convert UTFa hexadecimal string to a URLComponent string such like "%67%68".<br/>
 * Note that these "<code>0-9A-Za-z!'()*-._~</code>" characters will not
 * converted to "%xx" format by builtin 'encodeURIComponent()' function.
 * However this 'encodeURIComponentAll()' function will convert 
 * all of characters into "%xx" format.
 * @name encodeURIComponentAll
 * @function
 * @param {String} s hexadecimal string
 * @return {String} URIComponent string such like "%67%68"
 * @since 1.1
 */
function encodeURIComponentAll(u8) {
  var s = encodeURIComponent(u8);
  var s2 = "";
  for (var i = 0; i < s.length; i++) {
    if (s[i] == "%") {
      s2 = s2 + s.substr(i, 3);
      i = i + 2;
    } else {
      s2 = s2 + "%" + stohex(s[i]);
    }
  }
  return s2;
}

// ==== new lines ================================
/**
 * convert all DOS new line("\r\n") to UNIX new line("\n") in 
 * a String "s".
 * @name newline_toUnix
 * @function
 * @param {String} s string 
 * @return {String} converted string
 */
function newline_toUnix(s) {
    s = s.replace(/\r\n/mg, "\n");
    return s;
}

/**
 * convert all UNIX new line("\r\n") to DOS new line("\n") in 
 * a String "s".
 * @name newline_toDos
 * @function
 * @param {String} s string 
 * @return {String} converted string
 */
function newline_toDos(s) {
    s = s.replace(/\r\n/mg, "\n");
    s = s.replace(/\n/mg, "\r\n");
    return s;
}

// ==== string type checker ===================

/**
 * check whether a string is an integer string or not<br/>
 * @name isInteger
 * @memberOf KJUR.lang.String
 * @function
 * @static
 * @param {String} s input string
 * @return {Boolean} true if a string "s" is an integer string otherwise false
 * @since base64x 1.1.7 jsrsasign 5.0.13
 * @example
 * KJUR.lang.String.isInteger("12345") &rarr; true
 * KJUR.lang.String.isInteger("123ab") &rarr; false
 */
KJUR.lang.String.isInteger = function(s) {
    if (s.match(/^[0-9]+$/)) {
	return true;
    } else if (s.match(/^-[0-9]+$/)) {
	return true;
    } else {
	return false;
    }
};

/**
 * check whether a string is an hexadecimal string or not<br/>
 * @name isHex
 * @memberOf KJUR.lang.String
 * @function
 * @static
 * @param {String} s input string
 * @return {Boolean} true if a string "s" is an hexadecimal string otherwise false
 * @since base64x 1.1.7 jsrsasign 5.0.13
 * @example
 * KJUR.lang.String.isHex("1234") &rarr; true
 * KJUR.lang.String.isHex("12ab") &rarr; true
 * KJUR.lang.String.isHex("12AB") &rarr; true
 * KJUR.lang.String.isHex("12ZY") &rarr; false
 * KJUR.lang.String.isHex("121") &rarr; false -- odd length
 */
KJUR.lang.String.isHex = function(s) {
    if (s.length % 2 == 0 &&
	(s.match(/^[0-9a-f]+$/) || s.match(/^[0-9A-F]+$/))) {
	return true;
    } else {
	return false;
    }
};

/**
 * check whether a string is a base64 encoded string or not<br/>
 * Input string can conclude new lines or space characters.
 * @name isBase64
 * @memberOf KJUR.lang.String
 * @function
 * @static
 * @param {String} s input string
 * @return {Boolean} true if a string "s" is a base64 encoded string otherwise false
 * @since base64x 1.1.7 jsrsasign 5.0.13
 * @example
 * KJUR.lang.String.isBase64("YWE=") &rarr; true
 * KJUR.lang.String.isBase64("YW_=") &rarr; false
 * KJUR.lang.String.isBase64("YWE") &rarr; false -- length shall be multiples of 4
 */
KJUR.lang.String.isBase64 = function(s) {
    s = s.replace(/\s+/g, "");
    if (s.match(/^[0-9A-Za-z+\/]+={0,3}$/) && s.length % 4 == 0) {
	return true;
    } else {
	return false;
    }
};

/**
 * check whether a string is a base64url encoded string or not<br/>
 * Input string can conclude new lines or space characters.
 * @name isBase64URL
 * @memberOf KJUR.lang.String
 * @function
 * @static
 * @param {String} s input string
 * @return {Boolean} true if a string "s" is a base64url encoded string otherwise false
 * @since base64x 1.1.7 jsrsasign 5.0.13
 * @example
 * KJUR.lang.String.isBase64URL("YWE") &rarr; true
 * KJUR.lang.String.isBase64URL("YW-") &rarr; true
 * KJUR.lang.String.isBase64URL("YW+") &rarr; false
 */
KJUR.lang.String.isBase64URL = function(s) {
    if (s.match(/[+/=]/)) return false;
    s = b64utob64(s);
    return KJUR.lang.String.isBase64(s);
};

/**
 * check whether a string is a string of integer array or not<br/>
 * Input string can conclude new lines or space characters.
 * @name isIntegerArray
 * @memberOf KJUR.lang.String
 * @function
 * @static
 * @param {String} s input string
 * @return {Boolean} true if a string "s" is a string of integer array otherwise false
 * @since base64x 1.1.7 jsrsasign 5.0.13
 * @example
 * KJUR.lang.String.isIntegerArray("[1,2,3]") &rarr; true
 * KJUR.lang.String.isIntegerArray("  [1, 2, 3  ] ") &rarr; true
 * KJUR.lang.String.isIntegerArray("[a,2]") &rarr; false
 */
KJUR.lang.String.isIntegerArray = function(s) {
    s = s.replace(/\s+/g, "");
    if (s.match(/^\[[0-9,]+\]$/)) {
	return true;
    } else {
	return false;
    }
};

// ==== others ================================

/**
 * canonicalize hexadecimal string of positive integer<br/>
 * @name hextoposhex
 * @function
 * @param {String} s hexadecimal string 
 * @return {String} canonicalized hexadecimal string of positive integer
 * @since base64x 1.1.10 jsrsasign 7.1.4
 * @description
 * This method canonicalize a hexadecimal string of positive integer
 * for two's complement representation.
 * Canonicalized hexadecimal string of positive integer will be:
 * <ul>
 * <li>Its length is always even.</li>
 * <li>If odd length it will be padded with leading zero.<li>
 * <li>If it is even length and its first character is "8" or greater,
 * it will be padded with "00" to make it positive integer.</li>
 * </ul>
 * @example
 * hextoposhex("abcd") &rarr; "00abcd"
 * hextoposhex("1234") &rarr; "1234"
 * hextoposhex("12345") &rarr; "012345"
 */
function hextoposhex(s) {
    if (s.length % 2 == 1) return "0" + s;
    if (s.substr(0, 1) > "7") return "00" + s;
    return s;
}

/**
 * convert string of integer array to hexadecimal string.<br/>
 * @name intarystrtohex
 * @function
 * @param {String} s string of integer array
 * @return {String} hexadecimal string
 * @since base64x 1.1.6 jsrsasign 5.0.2
 * @throws "malformed integer array string: *" for wrong input
 * @description
 * This function converts a string of JavaScript integer array to
 * a hexadecimal string. Each integer value shall be in a range 
 * from 0 to 255 otherwise it raise exception. Input string can
 * have extra space or newline string so that they will be ignored.
 * 
 * @example
 * intarystrtohex(" [123, 34, 101, 34, 58] ")
 * &rarr; 7b2265223a (i.e. '{"e":' as string)
 */
function intarystrtohex(s) {
  s = s.replace(/^\s*\[\s*/, '');
  s = s.replace(/\s*\]\s*$/, '');
  s = s.replace(/\s*/g, '');
  try {
    var hex = s.split(/,/).map(function(element, index, array) {
      var i = parseInt(element);
      if (i < 0 || 255 < i) throw "integer not in range 0-255";
      var hI = ("00" + i.toString(16)).slice(-2);
      return hI;
    }).join('');
    return hex;
  } catch(ex) {
    throw "malformed integer array string: " + ex;
  }
}

/**
 * find index of string where two string differs
 * @name strdiffidx
 * @function
 * @param {String} s1 string to compare
 * @param {String} s2 string to compare
 * @return {Number} string index of where character differs. Return -1 if same.
 * @since jsrsasign 4.9.0 base64x 1.1.5
 * @example
 * strdiffidx("abcdefg", "abcd4fg") -> 4
 * strdiffidx("abcdefg", "abcdefg") -> -1
 * strdiffidx("abcdefg", "abcdef") -> 6
 * strdiffidx("abcdefgh", "abcdef") -> 6
 */
var strdiffidx = function(s1, s2) {
    var n = s1.length;
    if (s1.length > s2.length) n = s2.length;
    for (var i = 0; i < n; i++) {
	if (s1.charCodeAt(i) != s2.charCodeAt(i)) return i;
    }
    if (s1.length != s2.length) return n;
    return -1; // same
};


/* crypto-1.2.1.js (c) 2013-2017 Kenji Urushima | kjur.github.io/jsrsasign/license
 */
/*
 * crypto.js - Cryptographic Algorithm Provider class
 *
 * Copyright (c) 2013-2017 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name crypto-1.1.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version 1.2.1 (2017-Sep-15)
 * @since jsrsasign 2.2
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

/** 
 * kjur's class library name space
 * @name KJUR
 * @namespace kjur's class library name space
 */
if (typeof KJUR == "undefined" || !KJUR) KJUR = {};
/**
 * kjur's cryptographic algorithm provider library name space
 * <p>
 * This namespace privides following crytpgrahic classes.
 * <ul>
 * <li>{@link KJUR.crypto.MessageDigest} - Java JCE(cryptograhic extension) style MessageDigest class</li>
 * <li>{@link KJUR.crypto.Signature} - Java JCE(cryptograhic extension) style Signature class</li>
 * <li>{@link KJUR.crypto.Cipher} - class for encrypting and decrypting data</li>
 * <li>{@link KJUR.crypto.Util} - cryptographic utility functions and properties</li>
 * </ul>
 * NOTE: Please ignore method summary and document of this namespace. This caused by a bug of jsdoc2.
 * </p>
 * @name KJUR.crypto
 * @namespace
 */
if (typeof KJUR.crypto == "undefined" || !KJUR.crypto) KJUR.crypto = {};

/**
 * static object for cryptographic function utilities
 * @name KJUR.crypto.Util
 * @class static object for cryptographic function utilities
 * @property {Array} DIGESTINFOHEAD PKCS#1 DigestInfo heading hexadecimal bytes for each hash algorithms
 * @property {Array} DEFAULTPROVIDER associative array of default provider name for each hash and signature algorithms
 * @description
 */
KJUR.crypto.Util = new function() {
    this.DIGESTINFOHEAD = {
	'sha1':      "3021300906052b0e03021a05000414",
        'sha224':    "302d300d06096086480165030402040500041c",
	'sha256':    "3031300d060960864801650304020105000420",
	'sha384':    "3041300d060960864801650304020205000430",
	'sha512':    "3051300d060960864801650304020305000440",
	'md2':       "3020300c06082a864886f70d020205000410",
	'md5':       "3020300c06082a864886f70d020505000410",
	'ripemd160': "3021300906052b2403020105000414",
    };

    /*
     * @since crypto 1.1.1
     */
    this.DEFAULTPROVIDER = {
	'md5':			'cryptojs',
	'sha1':			'cryptojs',
	'sha224':		'cryptojs',
	'sha256':		'cryptojs',
	'sha384':		'cryptojs',
	'sha512':		'cryptojs',
	'ripemd160':		'cryptojs',
	'hmacmd5':		'cryptojs',
	'hmacsha1':		'cryptojs',
	'hmacsha224':		'cryptojs',
	'hmacsha256':		'cryptojs',
	'hmacsha384':		'cryptojs',
	'hmacsha512':		'cryptojs',
	'hmacripemd160':	'cryptojs',

	'MD5withRSA':		'cryptojs/jsrsa',
	'SHA1withRSA':		'cryptojs/jsrsa',
	'SHA224withRSA':	'cryptojs/jsrsa',
	'SHA256withRSA':	'cryptojs/jsrsa',
	'SHA384withRSA':	'cryptojs/jsrsa',
	'SHA512withRSA':	'cryptojs/jsrsa',
	'RIPEMD160withRSA':	'cryptojs/jsrsa',

	'MD5withECDSA':		'cryptojs/jsrsa',
	'SHA1withECDSA':	'cryptojs/jsrsa',
	'SHA224withECDSA':	'cryptojs/jsrsa',
	'SHA256withECDSA':	'cryptojs/jsrsa',
	'SHA384withECDSA':	'cryptojs/jsrsa',
	'SHA512withECDSA':	'cryptojs/jsrsa',
	'RIPEMD160withECDSA':	'cryptojs/jsrsa',

	'SHA1withDSA':		'cryptojs/jsrsa',
	'SHA224withDSA':	'cryptojs/jsrsa',
	'SHA256withDSA':	'cryptojs/jsrsa',

	'MD5withRSAandMGF1':		'cryptojs/jsrsa',
	'SHA1withRSAandMGF1':		'cryptojs/jsrsa',
	'SHA224withRSAandMGF1':		'cryptojs/jsrsa',
	'SHA256withRSAandMGF1':		'cryptojs/jsrsa',
	'SHA384withRSAandMGF1':		'cryptojs/jsrsa',
	'SHA512withRSAandMGF1':		'cryptojs/jsrsa',
	'RIPEMD160withRSAandMGF1':	'cryptojs/jsrsa',
    };

    /*
     * @since crypto 1.1.2
     */
    this.CRYPTOJSMESSAGEDIGESTNAME = {
	'md5':		CryptoJS.algo.MD5,
	'sha1':		CryptoJS.algo.SHA1,
	'sha224':	CryptoJS.algo.SHA224,
	'sha256':	CryptoJS.algo.SHA256,
	'sha384':	CryptoJS.algo.SHA384,
	'sha512':	CryptoJS.algo.SHA512,
	'ripemd160':	CryptoJS.algo.RIPEMD160
    };

    /**
     * get hexadecimal DigestInfo
     * @name getDigestInfoHex
     * @memberOf KJUR.crypto.Util
     * @function
     * @param {String} hHash hexadecimal hash value
     * @param {String} alg hash algorithm name (ex. 'sha1')
     * @return {String} hexadecimal string DigestInfo ASN.1 structure
     */
    this.getDigestInfoHex = function(hHash, alg) {
	if (typeof this.DIGESTINFOHEAD[alg] == "undefined")
	    throw "alg not supported in Util.DIGESTINFOHEAD: " + alg;
	return this.DIGESTINFOHEAD[alg] + hHash;
    };

    /**
     * get PKCS#1 padded hexadecimal DigestInfo
     * @name getPaddedDigestInfoHex
     * @memberOf KJUR.crypto.Util
     * @function
     * @param {String} hHash hexadecimal hash value of message to be signed
     * @param {String} alg hash algorithm name (ex. 'sha1')
     * @param {Integer} keySize key bit length (ex. 1024)
     * @return {String} hexadecimal string of PKCS#1 padded DigestInfo
     */
    this.getPaddedDigestInfoHex = function(hHash, alg, keySize) {
	var hDigestInfo = this.getDigestInfoHex(hHash, alg);
	var pmStrLen = keySize / 4; // minimum PM length

	if (hDigestInfo.length + 22 > pmStrLen) // len(0001+ff(*8)+00+hDigestInfo)=22
	    throw "key is too short for SigAlg: keylen=" + keySize + "," + alg;

	var hHead = "0001";
	var hTail = "00" + hDigestInfo;
	var hMid = "";
	var fLen = pmStrLen - hHead.length - hTail.length;
	for (var i = 0; i < fLen; i += 2) {
	    hMid += "ff";
	}
	var hPaddedMessage = hHead + hMid + hTail;
	return hPaddedMessage;
    };

    /**
     * get hexadecimal hash of string with specified algorithm
     * @name hashString
     * @memberOf KJUR.crypto.Util
     * @function
     * @param {String} s input string to be hashed
     * @param {String} alg hash algorithm name
     * @return {String} hexadecimal string of hash value
     * @since 1.1.1
     */
    this.hashString = function(s, alg) {
        var md = new KJUR.crypto.MessageDigest({'alg': alg});
        return md.digestString(s);
    };

    /**
     * get hexadecimal hash of hexadecimal string with specified algorithm
     * @name hashHex
     * @memberOf KJUR.crypto.Util
     * @function
     * @param {String} sHex input hexadecimal string to be hashed
     * @param {String} alg hash algorithm name
     * @return {String} hexadecimal string of hash value
     * @since 1.1.1
     */
    this.hashHex = function(sHex, alg) {
        var md = new KJUR.crypto.MessageDigest({'alg': alg});
        return md.digestHex(sHex);
    };

    /**
     * get hexadecimal SHA1 hash of string
     * @name sha1
     * @memberOf KJUR.crypto.Util
     * @function
     * @param {String} s input string to be hashed
     * @return {String} hexadecimal string of hash value
     * @since 1.0.3
     */
    this.sha1 = function(s) {
        var md = new KJUR.crypto.MessageDigest({'alg':'sha1', 'prov':'cryptojs'});
        return md.digestString(s);
    };

    /**
     * get hexadecimal SHA256 hash of string
     * @name sha256
     * @memberOf KJUR.crypto.Util
     * @function
     * @param {String} s input string to be hashed
     * @return {String} hexadecimal string of hash value
     * @since 1.0.3
     */
    this.sha256 = function(s) {
        var md = new KJUR.crypto.MessageDigest({'alg':'sha256', 'prov':'cryptojs'});
        return md.digestString(s);
    };

    this.sha256Hex = function(s) {
        var md = new KJUR.crypto.MessageDigest({'alg':'sha256', 'prov':'cryptojs'});
        return md.digestHex(s);
    };

    /**
     * get hexadecimal SHA512 hash of string
     * @name sha512
     * @memberOf KJUR.crypto.Util
     * @function
     * @param {String} s input string to be hashed
     * @return {String} hexadecimal string of hash value
     * @since 1.0.3
     */
    this.sha512 = function(s) {
        var md = new KJUR.crypto.MessageDigest({'alg':'sha512', 'prov':'cryptojs'});
        return md.digestString(s);
    };

    this.sha512Hex = function(s) {
        var md = new KJUR.crypto.MessageDigest({'alg':'sha512', 'prov':'cryptojs'});
        return md.digestHex(s);
    };

};

/**
 * get hexadecimal MD5 hash of string
 * @name md5
 * @memberOf KJUR.crypto.Util
 * @function
 * @param {String} s input string to be hashed
 * @return {String} hexadecimal string of hash value
 * @since 1.0.3
 * @example
 * Util.md5('aaa') &rarr; 47bce5c74f589f4867dbd57e9ca9f808
 */
KJUR.crypto.Util.md5 = function(s) {
    var md = new KJUR.crypto.MessageDigest({'alg':'md5', 'prov':'cryptojs'});
    return md.digestString(s);
};

/**
 * get hexadecimal RIPEMD160 hash of string
 * @name ripemd160
 * @memberOf KJUR.crypto.Util
 * @function
 * @param {String} s input string to be hashed
 * @return {String} hexadecimal string of hash value
 * @since 1.0.3
 * @example
 * KJUR.crypto.Util.ripemd160("aaa") &rarr; 08889bd7b151aa174c21f33f59147fa65381edea
 */
KJUR.crypto.Util.ripemd160 = function(s) {
    var md = new KJUR.crypto.MessageDigest({'alg':'ripemd160', 'prov':'cryptojs'});
    return md.digestString(s);
};

// @since jsrsasign 7.0.0 crypto 1.1.11
KJUR.crypto.Util.SECURERANDOMGEN = new SecureRandom();

/**
 * get hexadecimal string of random value from with specified byte length<br/>
 * @name getRandomHexOfNbytes
 * @memberOf KJUR.crypto.Util
 * @function
 * @param {Integer} n length of bytes of random
 * @return {String} hexadecimal string of random
 * @since jsrsasign 7.0.0 crypto 1.1.11
 * @example
 * KJUR.crypto.Util.getRandomHexOfNbytes(3) &rarr; "6314af", "000000" or "001fb4"
 * KJUR.crypto.Util.getRandomHexOfNbytes(128) &rarr; "8fbc..." in 1024bits 
 */
KJUR.crypto.Util.getRandomHexOfNbytes = function(n) {
    var ba = new Array(n);
    KJUR.crypto.Util.SECURERANDOMGEN.nextBytes(ba);
    return BAtohex(ba);
};

/**
 * get BigInteger object of random value from with specified byte length<br/>
 * @name getRandomBigIntegerOfNbytes
 * @memberOf KJUR.crypto.Util
 * @function
 * @param {Integer} n length of bytes of random
 * @return {BigInteger} BigInteger object of specified random value
 * @since jsrsasign 7.0.0 crypto 1.1.11
 * @example
 * KJUR.crypto.Util.getRandomBigIntegerOfNbytes(3) &rarr; 6314af of BigInteger
 * KJUR.crypto.Util.getRandomBigIntegerOfNbytes(128) &rarr; 8fbc... of BigInteger
 */
KJUR.crypto.Util.getRandomBigIntegerOfNbytes = function(n) {
    return new BigInteger(KJUR.crypto.Util.getRandomHexOfNbytes(n), 16);
};

/**
 * get hexadecimal string of random value from with specified bit length<br/>
 * @name getRandomHexOfNbits
 * @memberOf KJUR.crypto.Util
 * @function
 * @param {Integer} n length of bits of random
 * @return {String} hexadecimal string of random
 * @since jsrsasign 7.0.0 crypto 1.1.11
 * @example
 * KJUR.crypto.Util.getRandomHexOfNbits(24) &rarr; "6314af", "000000" or "001fb4"
 * KJUR.crypto.Util.getRandomHexOfNbits(1024) &rarr; "8fbc..." in 1024bits 
 */
KJUR.crypto.Util.getRandomHexOfNbits = function(n) {
    var n_remainder = n % 8;
    var n_quotient = (n - n_remainder) / 8;
    var ba = new Array(n_quotient + 1);
    KJUR.crypto.Util.SECURERANDOMGEN.nextBytes(ba);
    ba[0] = (((255 << n_remainder) & 255) ^ 255) & ba[0];
    return BAtohex(ba);
};

/**
 * get BigInteger object of random value from with specified bit length<br/>
 * @name getRandomBigIntegerOfNbits
 * @memberOf KJUR.crypto.Util
 * @function
 * @param {Integer} n length of bits of random
 * @return {BigInteger} BigInteger object of specified random value
 * @since jsrsasign 7.0.0 crypto 1.1.11
 * @example
 * KJUR.crypto.Util.getRandomBigIntegerOfNbits(24) &rarr; 6314af of BigInteger
 * KJUR.crypto.Util.getRandomBigIntegerOfNbits(1024) &rarr; 8fbc... of BigInteger
 */
KJUR.crypto.Util.getRandomBigIntegerOfNbits = function(n) {
    return new BigInteger(KJUR.crypto.Util.getRandomHexOfNbits(n), 16);
};

/**
 * get BigInteger object of random value from zero to max value<br/>
 * @name getRandomBigIntegerZeroToMax
 * @memberOf KJUR.crypto.Util
 * @function
 * @param {BigInteger} biMax max value of BigInteger object for random value
 * @return {BigInteger} BigInteger object of specified random value
 * @since jsrsasign 7.0.0 crypto 1.1.11
 * @description
 * This static method generates a BigInteger object with random value
 * greater than or equal to zero and smaller than or equal to biMax
 * (i.e. 0 &le; result &le; biMax).
 * @example
 * biMax = new BigInteger("3fa411...", 16);
 * KJUR.crypto.Util.getRandomBigIntegerZeroToMax(biMax) &rarr; 8fbc... of BigInteger
 */
KJUR.crypto.Util.getRandomBigIntegerZeroToMax = function(biMax) {
    var bitLenMax = biMax.bitLength();
    while (1) {
	var biRand = KJUR.crypto.Util.getRandomBigIntegerOfNbits(bitLenMax);
	if (biMax.compareTo(biRand) != -1) return biRand;
    }
};

/**
 * get BigInteger object of random value from min value to max value<br/>
 * @name getRandomBigIntegerMinToMax
 * @memberOf KJUR.crypto.Util
 * @function
 * @param {BigInteger} biMin min value of BigInteger object for random value
 * @param {BigInteger} biMax max value of BigInteger object for random value
 * @return {BigInteger} BigInteger object of specified random value
 * @since jsrsasign 7.0.0 crypto 1.1.11
 * @description
 * This static method generates a BigInteger object with random value
 * greater than or equal to biMin and smaller than or equal to biMax
 * (i.e. biMin &le; result &le; biMax).
 * @example
 * biMin = new BigInteger("2fa411...", 16);
 * biMax = new BigInteger("3fa411...", 16);
 * KJUR.crypto.Util.getRandomBigIntegerMinToMax(biMin, biMax) &rarr; 32f1... of BigInteger
 */
KJUR.crypto.Util.getRandomBigIntegerMinToMax = function(biMin, biMax) {
    var flagCompare = biMin.compareTo(biMax);
    if (flagCompare == 1) throw "biMin is greater than biMax";
    if (flagCompare == 0) return biMin;

    var biDiff = biMax.subtract(biMin);
    var biRand = KJUR.crypto.Util.getRandomBigIntegerZeroToMax(biDiff);
    return biRand.add(biMin);
};

// === Mac ===============================================================

/**
 * MessageDigest class which is very similar to java.security.MessageDigest class<br/>
 * @name KJUR.crypto.MessageDigest
 * @class MessageDigest class which is very similar to java.security.MessageDigest class
 * @param {Array} params parameters for constructor
 * @property {Array} HASHLENGTH static Array of resulted byte length of hash (ex. HASHLENGTH["sha1"] == 20)
 * @description
 * <br/>
 * Currently this supports following algorithm and providers combination:
 * <ul>
 * <li>md5 - cryptojs</li>
 * <li>sha1 - cryptojs</li>
 * <li>sha224 - cryptojs</li>
 * <li>sha256 - cryptojs</li>
 * <li>sha384 - cryptojs</li>
 * <li>sha512 - cryptojs</li>
 * <li>ripemd160 - cryptojs</li>
 * <li>sha256 - sjcl (NEW from crypto.js 1.0.4)</li>
 * </ul>
 * @example
 * // CryptoJS provider sample
 * var md = new KJUR.crypto.MessageDigest({alg: "sha1", prov: "cryptojs"});
 * md.updateString('aaa')
 * var mdHex = md.digest()
 *
 * // SJCL(Stanford JavaScript Crypto Library) provider sample
 * var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "sjcl"}); // sjcl supports sha256 only
 * md.updateString('aaa')
 * var mdHex = md.digest()
 *
 * // HASHLENGTH property
 * KJUR.crypto.MessageDigest.HASHLENGTH['sha1'] &rarr 20
 * KJUR.crypto.MessageDigest.HASHLENGTH['sha512'] &rarr 64
 */
KJUR.crypto.MessageDigest = function(params) {
    var md = null;
    var algName = null;
    var provName = null;

    /**
     * set hash algorithm and provider<br/>
     * @name setAlgAndProvider
     * @memberOf KJUR.crypto.MessageDigest#
     * @function
     * @param {String} alg hash algorithm name
     * @param {String} prov provider name
     * @description
     * This methods set an algorithm and a cryptographic provider.<br/>
     * Here is acceptable algorithm names ignoring cases and hyphens:
     * <ul>
     * <li>MD5</li>
     * <li>SHA1</li>
     * <li>SHA224</li>
     * <li>SHA256</li>
     * <li>SHA384</li>
     * <li>SHA512</li>
     * <li>RIPEMD160</li>
     * </ul>
     * NOTE: Since jsrsasign 6.2.0 crypto 1.1.10, this method ignores
     * upper or lower cases. Also any hyphens (i.e. "-") will be ignored
     * so that "SHA1" or "SHA-1" will be acceptable.
     * @example
     * // for SHA1
     * md.setAlgAndProvider('sha1', 'cryptojs');
     * md.setAlgAndProvider('SHA1');
     * // for RIPEMD160
     * md.setAlgAndProvider('ripemd160', 'cryptojs');
     */
    this.setAlgAndProvider = function(alg, prov) {
	alg = KJUR.crypto.MessageDigest.getCanonicalAlgName(alg);

	if (alg !== null && prov === undefined) prov = KJUR.crypto.Util.DEFAULTPROVIDER[alg];

	// for cryptojs
	if (':md5:sha1:sha224:sha256:sha384:sha512:ripemd160:'.indexOf(alg) != -1 &&
	    prov == 'cryptojs') {
	    try {
		this.md = KJUR.crypto.Util.CRYPTOJSMESSAGEDIGESTNAME[alg].create();
	    } catch (ex) {
		throw "setAlgAndProvider hash alg set fail alg=" + alg + "/" + ex;
	    }
	    this.updateString = function(str) {
		this.md.update(str);
	    };
	    this.updateHex = function(hex) {
		var wHex = CryptoJS.enc.Hex.parse(hex);
		this.md.update(wHex);
	    };
	    this.digest = function() {
		var hash = this.md.finalize();
		return hash.toString(CryptoJS.enc.Hex);
	    };
	    this.digestString = function(str) {
		this.updateString(str);
		return this.digest();
	    };
	    this.digestHex = function(hex) {
		this.updateHex(hex);
		return this.digest();
	    };
	}
	if (':sha256:'.indexOf(alg) != -1 &&
	    prov == 'sjcl') {
	    try {
		this.md = new sjcl.hash.sha256();
	    } catch (ex) {
		throw "setAlgAndProvider hash alg set fail alg=" + alg + "/" + ex;
	    }
	    this.updateString = function(str) {
		this.md.update(str);
	    };
	    this.updateHex = function(hex) {
		var baHex = sjcl.codec.hex.toBits(hex);
		this.md.update(baHex);
	    };
	    this.digest = function() {
		var hash = this.md.finalize();
		return sjcl.codec.hex.fromBits(hash);
	    };
	    this.digestString = function(str) {
		this.updateString(str);
		return this.digest();
	    };
	    this.digestHex = function(hex) {
		this.updateHex(hex);
		return this.digest();
	    };
	}
    };

    /**
     * update digest by specified string
     * @name updateString
     * @memberOf KJUR.crypto.MessageDigest#
     * @function
     * @param {String} str string to update
     * @description
     * @example
     * md.updateString('New York');
     */
    this.updateString = function(str) {
	throw "updateString(str) not supported for this alg/prov: " + this.algName + "/" + this.provName;
    };

    /**
     * update digest by specified hexadecimal string
     * @name updateHex
     * @memberOf KJUR.crypto.MessageDigest#
     * @function
     * @param {String} hex hexadecimal string to update
     * @description
     * @example
     * md.updateHex('0afe36');
     */
    this.updateHex = function(hex) {
	throw "updateHex(hex) not supported for this alg/prov: " + this.algName + "/" + this.provName;
    };

    /**
     * completes hash calculation and returns hash result
     * @name digest
     * @memberOf KJUR.crypto.MessageDigest#
     * @function
     * @description
     * @example
     * md.digest()
     */
    this.digest = function() {
	throw "digest() not supported for this alg/prov: " + this.algName + "/" + this.provName;
    };

    /**
     * performs final update on the digest using string, then completes the digest computation
     * @name digestString
     * @memberOf KJUR.crypto.MessageDigest#
     * @function
     * @param {String} str string to final update
     * @description
     * @example
     * md.digestString('aaa')
     */
    this.digestString = function(str) {
	throw "digestString(str) not supported for this alg/prov: " + this.algName + "/" + this.provName;
    };

    /**
     * performs final update on the digest using hexadecimal string, then completes the digest computation
     * @name digestHex
     * @memberOf KJUR.crypto.MessageDigest#
     * @function
     * @param {String} hex hexadecimal string to final update
     * @description
     * @example
     * md.digestHex('0f2abd')
     */
    this.digestHex = function(hex) {
	throw "digestHex(hex) not supported for this alg/prov: " + this.algName + "/" + this.provName;
    };

    if (params !== undefined) {
	if (params['alg'] !== undefined) {
	    this.algName = params['alg'];
	    if (params['prov'] === undefined)
		this.provName = KJUR.crypto.Util.DEFAULTPROVIDER[this.algName];
	    this.setAlgAndProvider(this.algName, this.provName);
	}
    }
};

/**
 * get canonical hash algorithm name<br/>
 * @name getCanonicalAlgName
 * @memberOf KJUR.crypto.MessageDigest
 * @function
 * @param {String} alg hash algorithm name (ex. MD5, SHA-1, SHA1, SHA512 et.al.)
 * @return {String} canonical hash algorithm name
 * @since jsrsasign 6.2.0 crypto 1.1.10
 * @description
 * This static method normalizes from any hash algorithm name such as
 * "SHA-1", "SHA1", "MD5", "sha512" to lower case name without hyphens
 * such as "sha1".
 * @example
 * KJUR.crypto.MessageDigest.getCanonicalAlgName("SHA-1") &rarr "sha1"
 * KJUR.crypto.MessageDigest.getCanonicalAlgName("MD5")   &rarr "md5"
 */
KJUR.crypto.MessageDigest.getCanonicalAlgName = function(alg) {
    if (typeof alg === "string") {
	alg = alg.toLowerCase();
	alg = alg.replace(/-/, '');
    }
    return alg;
};

/**
 * get resulted hash byte length for specified algorithm name<br/>
 * @name getHashLength
 * @memberOf KJUR.crypto.MessageDigest
 * @function
 * @param {String} alg non-canonicalized hash algorithm name (ex. MD5, SHA-1, SHA1, SHA512 et.al.)
 * @return {Integer} resulted hash byte length
 * @since jsrsasign 6.2.0 crypto 1.1.10
 * @description
 * This static method returns resulted byte length for specified algorithm name such as "SHA-1".
 * @example
 * KJUR.crypto.MessageDigest.getHashLength("SHA-1") &rarr 20
 * KJUR.crypto.MessageDigest.getHashLength("sha1") &rarr 20
 */
KJUR.crypto.MessageDigest.getHashLength = function(alg) {
    var MD = KJUR.crypto.MessageDigest
    var alg2 = MD.getCanonicalAlgName(alg);
    if (MD.HASHLENGTH[alg2] === undefined)
	throw "not supported algorithm: " + alg;
    return MD.HASHLENGTH[alg2];
};

// described in KJUR.crypto.MessageDigest class (since jsrsasign 6.2.0 crypto 1.1.10)
KJUR.crypto.MessageDigest.HASHLENGTH = {
    'md5':		16,
    'sha1':		20,
    'sha224':		28,
    'sha256':		32,
    'sha384':		48,
    'sha512':		64,
    'ripemd160':	20
};

// === Mac ===============================================================

/**
 * Mac(Message Authentication Code) class which is very similar to java.security.Mac class 
 * @name KJUR.crypto.Mac
 * @class Mac class which is very similar to java.security.Mac class
 * @param {Array} params parameters for constructor
 * @description
 * <br/>
 * Currently this supports following algorithm and providers combination:
 * <ul>
 * <li>hmacmd5 - cryptojs</li>
 * <li>hmacsha1 - cryptojs</li>
 * <li>hmacsha224 - cryptojs</li>
 * <li>hmacsha256 - cryptojs</li>
 * <li>hmacsha384 - cryptojs</li>
 * <li>hmacsha512 - cryptojs</li>
 * </ul>
 * NOTE: HmacSHA224 and HmacSHA384 issue was fixed since jsrsasign 4.1.4.
 * Please use 'ext/cryptojs-312-core-fix*.js' instead of 'core.js' of original CryptoJS
 * to avoid those issue.
 * <br/>
 * NOTE2: Hmac signature bug was fixed in jsrsasign 4.9.0 by providing CryptoJS
 * bug workaround.
 * <br/>
 * Please see {@link KJUR.crypto.Mac.setPassword}, how to provide password
 * in various ways in detail.
 * @example
 * var mac = new KJUR.crypto.Mac({alg: "HmacSHA1", "pass": "pass"});
 * mac.updateString('aaa')
 * var macHex = mac.doFinal()
 *
 * // other password representation 
 * var mac = new KJUR.crypto.Mac({alg: "HmacSHA256", "pass": {"hex":  "6161"}});
 * var mac = new KJUR.crypto.Mac({alg: "HmacSHA256", "pass": {"utf8": "aa"}});
 * var mac = new KJUR.crypto.Mac({alg: "HmacSHA256", "pass": {"rstr": "\x61\x61"}});
 * var mac = new KJUR.crypto.Mac({alg: "HmacSHA256", "pass": {"b64":  "Mi02/+...a=="}});
 * var mac = new KJUR.crypto.Mac({alg: "HmacSHA256", "pass": {"b64u": "Mi02_-...a"}});
 */
KJUR.crypto.Mac = function(params) {
    var mac = null;
    var pass = null;
    var algName = null;
    var provName = null;
    var algProv = null;

    this.setAlgAndProvider = function(alg, prov) {
	alg = alg.toLowerCase();

	if (alg == null) alg = "hmacsha1";

	alg = alg.toLowerCase();
        if (alg.substr(0, 4) != "hmac") {
	    throw "setAlgAndProvider unsupported HMAC alg: " + alg;
	}

	if (prov === undefined) prov = KJUR.crypto.Util.DEFAULTPROVIDER[alg];
	this.algProv = alg + "/" + prov;

	var hashAlg = alg.substr(4);

	// for cryptojs
	if (':md5:sha1:sha224:sha256:sha384:sha512:ripemd160:'.indexOf(hashAlg) != -1 &&
	    prov == 'cryptojs') {
	    try {
		var mdObj = KJUR.crypto.Util.CRYPTOJSMESSAGEDIGESTNAME[hashAlg];
		this.mac = CryptoJS.algo.HMAC.create(mdObj, this.pass);
	    } catch (ex) {
		throw "setAlgAndProvider hash alg set fail hashAlg=" + hashAlg + "/" + ex;
	    }
	    this.updateString = function(str) {
		this.mac.update(str);
	    };
	    this.updateHex = function(hex) {
		var wHex = CryptoJS.enc.Hex.parse(hex);
		this.mac.update(wHex);
	    };
	    this.doFinal = function() {
		var hash = this.mac.finalize();
		return hash.toString(CryptoJS.enc.Hex);
	    };
	    this.doFinalString = function(str) {
		this.updateString(str);
		return this.doFinal();
	    };
	    this.doFinalHex = function(hex) {
		this.updateHex(hex);
		return this.doFinal();
	    };
	}
    };

    /**
     * update digest by specified string
     * @name updateString
     * @memberOf KJUR.crypto.Mac#
     * @function
     * @param {String} str string to update
     * @description
     * @example
     * mac.updateString('New York');
     */
    this.updateString = function(str) {
	throw "updateString(str) not supported for this alg/prov: " + this.algProv;
    };

    /**
     * update digest by specified hexadecimal string
     * @name updateHex
     * @memberOf KJUR.crypto.Mac#
     * @function
     * @param {String} hex hexadecimal string to update
     * @description
     * @example
     * mac.updateHex('0afe36');
     */
    this.updateHex = function(hex) {
	throw "updateHex(hex) not supported for this alg/prov: " + this.algProv;
    };

    /**
     * completes hash calculation and returns hash result
     * @name doFinal
     * @memberOf KJUR.crypto.Mac#
     * @function
     * @description
     * @example
     * mac.digest()
     */
    this.doFinal = function() {
	throw "digest() not supported for this alg/prov: " + this.algProv;
    };

    /**
     * performs final update on the digest using string, then completes the digest computation
     * @name doFinalString
     * @memberOf KJUR.crypto.Mac#
     * @function
     * @param {String} str string to final update
     * @description
     * @example
     * mac.digestString('aaa')
     */
    this.doFinalString = function(str) {
	throw "digestString(str) not supported for this alg/prov: " + this.algProv;
    };

    /**
     * performs final update on the digest using hexadecimal string, 
     * then completes the digest computation
     * @name doFinalHex
     * @memberOf KJUR.crypto.Mac#
     * @function
     * @param {String} hex hexadecimal string to final update
     * @description
     * @example
     * mac.digestHex('0f2abd')
     */
    this.doFinalHex = function(hex) {
	throw "digestHex(hex) not supported for this alg/prov: " + this.algProv;
    };

    /**
     * set password for Mac
     * @name setPassword
     * @memberOf KJUR.crypto.Mac#
     * @function
     * @param {Object} pass password for Mac
     * @since crypto 1.1.7 jsrsasign 4.9.0
     * @description
     * This method will set password for (H)Mac internally.
     * Argument 'pass' can be specified as following:
     * <ul>
     * <li>even length string of 0..9, a..f or A-F: implicitly specified as hexadecimal string</li>
     * <li>not above string: implicitly specified as raw string</li>
     * <li>{rstr: "\x65\x70"}: explicitly specified as raw string</li>
     * <li>{hex: "6570"}: explicitly specified as hexacedimal string</li>
     * <li>{utf8: "秘密"}: explicitly specified as UTF8 string</li>
     * <li>{b64: "Mi78..=="}: explicitly specified as Base64 string</li>
     * <li>{b64u: "Mi7-_"}: explicitly specified as Base64URL string</li>
     * </ul>
     * It is *STRONGLY RECOMMENDED* that explicit representation of password argument
     * to avoid ambiguity. For example string  "6161" can mean a string "6161" or 
     * a hexadecimal string of "aa" (i.e. \x61\x61).
     * @example
     * mac = KJUR.crypto.Mac({'alg': 'hmacsha256'});
     * // set password by implicit raw string
     * mac.setPassword("\x65\x70\xb9\x0b");
     * mac.setPassword("password");
     * // set password by implicit hexadecimal string
     * mac.setPassword("6570b90b");
     * mac.setPassword("6570B90B");
     * // set password by explicit raw string
     * mac.setPassword({"rstr": "\x65\x70\xb9\x0b"});
     * // set password by explicit hexadecimal string
     * mac.setPassword({"hex": "6570b90b"});
     * // set password by explicit utf8 string
     * mac.setPassword({"utf8": "passwordパスワード");
     * // set password by explicit Base64 string
     * mac.setPassword({"b64": "Mb+c3f/=="});
     * // set password by explicit Base64URL string
     * mac.setPassword({"b64u": "Mb-c3f_"});
     */
    this.setPassword = function(pass) {
	// internal this.pass shall be CryptoJS DWord Object for CryptoJS bug
	// work around. CrytoJS HMac password can be passed by
	// raw string as described in the manual however it doesn't
	// work properly in some case. If password was passed
	// by CryptoJS DWord which is not described in the manual
	// it seems to work. (fixed since crypto 1.1.7)

	if (typeof pass == 'string') {
	    var hPass = pass;
	    if (pass.length % 2 == 1 || ! pass.match(/^[0-9A-Fa-f]+$/)) { // raw str
		hPass = rstrtohex(pass);
	    }
	    this.pass = CryptoJS.enc.Hex.parse(hPass);
	    return;
	}

	if (typeof pass != 'object')
	    throw "KJUR.crypto.Mac unsupported password type: " + pass;
	
	var hPass = null;
	if (pass.hex  !== undefined) {
	    if (pass.hex.length % 2 != 0 || ! pass.hex.match(/^[0-9A-Fa-f]+$/))
		throw "Mac: wrong hex password: " + pass.hex;
	    hPass = pass.hex;
	}
	if (pass.utf8 !== undefined) hPass = utf8tohex(pass.utf8);
	if (pass.rstr !== undefined) hPass = rstrtohex(pass.rstr);
	if (pass.b64  !== undefined) hPass = b64tohex(pass.b64);
	if (pass.b64u !== undefined) hPass = b64utohex(pass.b64u);

	if (hPass == null)
	    throw "KJUR.crypto.Mac unsupported password type: " + pass;

	this.pass = CryptoJS.enc.Hex.parse(hPass);
    };

    if (params !== undefined) {
	if (params.pass !== undefined) {
	    this.setPassword(params.pass);
	}
	if (params.alg !== undefined) {
	    this.algName = params.alg;
	    if (params['prov'] === undefined)
		this.provName = KJUR.crypto.Util.DEFAULTPROVIDER[this.algName];
	    this.setAlgAndProvider(this.algName, this.provName);
	}
    }
};

// ====== Signature class =========================================================
/**
 * Signature class which is very similar to java.security.Signature class
 * @name KJUR.crypto.Signature
 * @class Signature class which is very similar to java.security.Signature class
 * @param {Array} params parameters for constructor
 * @property {String} state Current state of this signature object whether 'SIGN', 'VERIFY' or null
 * @description
 * <br/>
 * As for params of constructor's argument, it can be specify following attributes:
 * <ul>
 * <li>alg - signature algorithm name (ex. {MD5,SHA1,SHA224,SHA256,SHA384,SHA512,RIPEMD160}with{RSA,ECDSA,DSA})</li>
 * <li>provider - currently 'cryptojs/jsrsa' only</li>
 * </ul>
 * <h4>SUPPORTED ALGORITHMS AND PROVIDERS</h4>
 * This Signature class supports following signature algorithm and provider names:
 * <ul>
 * <li>MD5withRSA - cryptojs/jsrsa</li>
 * <li>SHA1withRSA - cryptojs/jsrsa</li>
 * <li>SHA224withRSA - cryptojs/jsrsa</li>
 * <li>SHA256withRSA - cryptojs/jsrsa</li>
 * <li>SHA384withRSA - cryptojs/jsrsa</li>
 * <li>SHA512withRSA - cryptojs/jsrsa</li>
 * <li>RIPEMD160withRSA - cryptojs/jsrsa</li>
 * <li>MD5withECDSA - cryptojs/jsrsa</li>
 * <li>SHA1withECDSA - cryptojs/jsrsa</li>
 * <li>SHA224withECDSA - cryptojs/jsrsa</li>
 * <li>SHA256withECDSA - cryptojs/jsrsa</li>
 * <li>SHA384withECDSA - cryptojs/jsrsa</li>
 * <li>SHA512withECDSA - cryptojs/jsrsa</li>
 * <li>RIPEMD160withECDSA - cryptojs/jsrsa</li>
 * <li>MD5withRSAandMGF1 - cryptojs/jsrsa</li>
 * <li>SHA1withRSAandMGF1 - cryptojs/jsrsa</li>
 * <li>SHA224withRSAandMGF1 - cryptojs/jsrsa</li>
 * <li>SHA256withRSAandMGF1 - cryptojs/jsrsa</li>
 * <li>SHA384withRSAandMGF1 - cryptojs/jsrsa</li>
 * <li>SHA512withRSAandMGF1 - cryptojs/jsrsa</li>
 * <li>RIPEMD160withRSAandMGF1 - cryptojs/jsrsa</li>
 * <li>SHA1withDSA - cryptojs/jsrsa</li>
 * <li>SHA224withDSA - cryptojs/jsrsa</li>
 * <li>SHA256withDSA - cryptojs/jsrsa</li>
 * </ul>
 * Here are supported elliptic cryptographic curve names and their aliases for ECDSA:
 * <ul>
 * <li>secp256k1</li>
 * <li>secp256r1, NIST P-256, P-256, prime256v1</li>
 * <li>secp384r1, NIST P-384, P-384</li>
 * </ul>
 * NOTE1: DSA signing algorithm is also supported since crypto 1.1.5.
 * <h4>EXAMPLES</h4>
 * @example
 * // RSA signature generation
 * var sig = new KJUR.crypto.Signature({"alg": "SHA1withRSA"});
 * sig.init(prvKeyPEM);
 * sig.updateString('aaa');
 * var hSigVal = sig.sign();
 *
 * // DSA signature validation
 * var sig2 = new KJUR.crypto.Signature({"alg": "SHA1withDSA"});
 * sig2.init(certPEM);
 * sig.updateString('aaa');
 * var isValid = sig2.verify(hSigVal);
 * 
 * // ECDSA signing
 * var sig = new KJUR.crypto.Signature({'alg':'SHA1withECDSA'});
 * sig.init(prvKeyPEM);
 * sig.updateString('aaa');
 * var sigValueHex = sig.sign();
 *
 * // ECDSA verifying
 * var sig2 = new KJUR.crypto.Signature({'alg':'SHA1withECDSA'});
 * sig.init(certPEM);
 * sig.updateString('aaa');
 * var isValid = sig.verify(sigValueHex);
 */
KJUR.crypto.Signature = function(params) {
    var prvKey = null; // RSAKey/KJUR.crypto.{ECDSA,DSA} object for signing
    var pubKey = null; // RSAKey/KJUR.crypto.{ECDSA,DSA} object for verifying

    var md = null; // KJUR.crypto.MessageDigest object
    var sig = null;
    var algName = null;
    var provName = null;
    var algProvName = null;
    var mdAlgName = null;
    var pubkeyAlgName = null;	// rsa,ecdsa,rsaandmgf1(=rsapss)
    var state = null;
    var pssSaltLen = -1;
    var initParams = null;

    var sHashHex = null; // hex hash value for hex
    var hDigestInfo = null;
    var hPaddedDigestInfo = null;
    var hSign = null;

    this._setAlgNames = function() {
    var matchResult = this.algName.match(/^(.+)with(.+)$/);
	if (matchResult) {
	    this.mdAlgName = matchResult[1].toLowerCase();
	    this.pubkeyAlgName = matchResult[2].toLowerCase();
	}
    };

    this._zeroPaddingOfSignature = function(hex, bitLength) {
	var s = "";
	var nZero = bitLength / 4 - hex.length;
	for (var i = 0; i < nZero; i++) {
	    s = s + "0";
	}
	return s + hex;
    };

    /**
     * set signature algorithm and provider
     * @name setAlgAndProvider
     * @memberOf KJUR.crypto.Signature#
     * @function
     * @param {String} alg signature algorithm name
     * @param {String} prov provider name
     * @description
     * @example
     * md.setAlgAndProvider('SHA1withRSA', 'cryptojs/jsrsa');
     */
    this.setAlgAndProvider = function(alg, prov) {
	this._setAlgNames();
	if (prov != 'cryptojs/jsrsa')
	    throw "provider not supported: " + prov;

	if (':md5:sha1:sha224:sha256:sha384:sha512:ripemd160:'.indexOf(this.mdAlgName) != -1) {
	    try {
		this.md = new KJUR.crypto.MessageDigest({'alg':this.mdAlgName});
	    } catch (ex) {
		throw "setAlgAndProvider hash alg set fail alg=" +
                    this.mdAlgName + "/" + ex;
	    }
	    
	    this.init = function(keyparam, pass) {
		var keyObj = null;
		try {
		    if (pass === undefined) {
			keyObj = KEYUTIL.getKey(keyparam);
		    } else {
			keyObj = KEYUTIL.getKey(keyparam, pass);
		    }
		} catch (ex) {
		    throw "init failed:" + ex;
		}

		if (keyObj.isPrivate === true) {
		    this.prvKey = keyObj;
		    this.state = "SIGN";
		} else if (keyObj.isPublic === true) {
		    this.pubKey = keyObj;
		    this.state = "VERIFY";
		} else {
		    throw "init failed.:" + keyObj;
		}
	    };

	    this.updateString = function(str) {
		this.md.updateString(str);
	    };

	    this.updateHex = function(hex) {
		this.md.updateHex(hex);
	    };

	    this.sign = function() {
		this.sHashHex = this.md.digest();
		if (typeof this.ecprvhex != "undefined" &&
		    typeof this.eccurvename != "undefined") {
		    var ec = new KJUR.crypto.ECDSA({'curve': this.eccurvename});
		    this.hSign = ec.signHex(this.sHashHex, this.ecprvhex);
		} else if (this.prvKey instanceof RSAKey &&
		           this.pubkeyAlgName === "rsaandmgf1") {
		    this.hSign = this.prvKey.signWithMessageHashPSS(this.sHashHex,
								    this.mdAlgName,
								    this.pssSaltLen);
		} else if (this.prvKey instanceof RSAKey &&
			   this.pubkeyAlgName === "rsa") {
		    this.hSign = this.prvKey.signWithMessageHash(this.sHashHex,
								 this.mdAlgName);
		} else if (this.prvKey instanceof KJUR.crypto.ECDSA) {
		    this.hSign = this.prvKey.signWithMessageHash(this.sHashHex);
		} else if (this.prvKey instanceof KJUR.crypto.DSA) {
		    this.hSign = this.prvKey.signWithMessageHash(this.sHashHex);
		} else {
		    throw "Signature: unsupported private key alg: " + this.pubkeyAlgName;
		}
		return this.hSign;
	    };
	    this.signString = function(str) {
		this.updateString(str);
		return this.sign();
	    };
	    this.signHex = function(hex) {
		this.updateHex(hex);
		return this.sign();
	    };
	    this.verify = function(hSigVal) {
	        this.sHashHex = this.md.digest();
		if (typeof this.ecpubhex != "undefined" &&
		    typeof this.eccurvename != "undefined") {
		    var ec = new KJUR.crypto.ECDSA({curve: this.eccurvename});
		    return ec.verifyHex(this.sHashHex, hSigVal, this.ecpubhex);
		} else if (this.pubKey instanceof RSAKey &&
			   this.pubkeyAlgName === "rsaandmgf1") {
		    return this.pubKey.verifyWithMessageHashPSS(this.sHashHex, hSigVal, 
								this.mdAlgName,
								this.pssSaltLen);
		} else if (this.pubKey instanceof RSAKey &&
			   this.pubkeyAlgName === "rsa") {
		    return this.pubKey.verifyWithMessageHash(this.sHashHex, hSigVal);
		} else if (KJUR.crypto.ECDSA !== undefined &&
			   this.pubKey instanceof KJUR.crypto.ECDSA) {
		    return this.pubKey.verifyWithMessageHash(this.sHashHex, hSigVal);
		} else if (KJUR.crypto.DSA !== undefined &&
			   this.pubKey instanceof KJUR.crypto.DSA) {
		    return this.pubKey.verifyWithMessageHash(this.sHashHex, hSigVal);
		} else {
		    throw "Signature: unsupported public key alg: " + this.pubkeyAlgName;
		}
	    };
	}
    };

    /**
     * Initialize this object for signing or verifying depends on key
     * @name init
     * @memberOf KJUR.crypto.Signature#
     * @function
     * @param {Object} key specifying public or private key as plain/encrypted PKCS#5/8 PEM file, certificate PEM or {@link RSAKey}, {@link KJUR.crypto.DSA} or {@link KJUR.crypto.ECDSA} object
     * @param {String} pass (OPTION) passcode for encrypted private key
     * @since crypto 1.1.3
     * @description
     * This method is very useful initialize method for Signature class since
     * you just specify key then this method will automatically initialize it
     * using {@link KEYUTIL.getKey} method.
     * As for 'key',  following argument type are supported:
     * <h5>signing</h5>
     * <ul>
     * <li>PEM formatted PKCS#8 encrypted RSA/ECDSA private key concluding "BEGIN ENCRYPTED PRIVATE KEY"</li>
     * <li>PEM formatted PKCS#5 encrypted RSA/DSA private key concluding "BEGIN RSA/DSA PRIVATE KEY" and ",ENCRYPTED"</li>
     * <li>PEM formatted PKCS#8 plain RSA/ECDSA private key concluding "BEGIN PRIVATE KEY"</li>
     * <li>PEM formatted PKCS#5 plain RSA/DSA private key concluding "BEGIN RSA/DSA PRIVATE KEY" without ",ENCRYPTED"</li>
     * <li>RSAKey object of private key</li>
     * <li>KJUR.crypto.ECDSA object of private key</li>
     * <li>KJUR.crypto.DSA object of private key</li>
     * </ul>
     * <h5>verification</h5>
     * <ul>
     * <li>PEM formatted PKCS#8 RSA/EC/DSA public key concluding "BEGIN PUBLIC KEY"</li>
     * <li>PEM formatted X.509 certificate with RSA/EC/DSA public key concluding
     *     "BEGIN CERTIFICATE", "BEGIN X509 CERTIFICATE" or "BEGIN TRUSTED CERTIFICATE".</li>
     * <li>RSAKey object of public key</li>
     * <li>KJUR.crypto.ECDSA object of public key</li>
     * <li>KJUR.crypto.DSA object of public key</li>
     * </ul>
     * @example
     * sig.init(sCertPEM)
     */
    this.init = function(key, pass) {
	throw "init(key, pass) not supported for this alg:prov=" +
	      this.algProvName;
    };

    /**
     * Updates the data to be signed or verified by a string
     * @name updateString
     * @memberOf KJUR.crypto.Signature#
     * @function
     * @param {String} str string to use for the update
     * @description
     * @example
     * sig.updateString('aaa')
     */
    this.updateString = function(str) {
	throw "updateString(str) not supported for this alg:prov=" + this.algProvName;
    };

    /**
     * Updates the data to be signed or verified by a hexadecimal string
     * @name updateHex
     * @memberOf KJUR.crypto.Signature#
     * @function
     * @param {String} hex hexadecimal string to use for the update
     * @description
     * @example
     * sig.updateHex('1f2f3f')
     */
    this.updateHex = function(hex) {
	throw "updateHex(hex) not supported for this alg:prov=" + this.algProvName;
    };

    /**
     * Returns the signature bytes of all data updates as a hexadecimal string
     * @name sign
     * @memberOf KJUR.crypto.Signature#
     * @function
     * @return the signature bytes as a hexadecimal string
     * @description
     * @example
     * var hSigValue = sig.sign()
     */
    this.sign = function() {
	throw "sign() not supported for this alg:prov=" + this.algProvName;
    };

    /**
     * performs final update on the sign using string, then returns the signature bytes of all data updates as a hexadecimal string
     * @name signString
     * @memberOf KJUR.crypto.Signature#
     * @function
     * @param {String} str string to final update
     * @return the signature bytes of a hexadecimal string
     * @description
     * @example
     * var hSigValue = sig.signString('aaa')
     */
    this.signString = function(str) {
	throw "digestString(str) not supported for this alg:prov=" + this.algProvName;
    };

    /**
     * performs final update on the sign using hexadecimal string, then returns the signature bytes of all data updates as a hexadecimal string
     * @name signHex
     * @memberOf KJUR.crypto.Signature#
     * @function
     * @param {String} hex hexadecimal string to final update
     * @return the signature bytes of a hexadecimal string
     * @description
     * @example
     * var hSigValue = sig.signHex('1fdc33')
     */
    this.signHex = function(hex) {
	throw "digestHex(hex) not supported for this alg:prov=" + this.algProvName;
    };

    /**
     * verifies the passed-in signature.
     * @name verify
     * @memberOf KJUR.crypto.Signature#
     * @function
     * @param {String} str string to final update
     * @return {Boolean} true if the signature was verified, otherwise false
     * @description
     * @example
     * var isValid = sig.verify('1fbcefdca4823a7(snip)')
     */
    this.verify = function(hSigVal) {
	throw "verify(hSigVal) not supported for this alg:prov=" + this.algProvName;
    };

    this.initParams = params;

    if (params !== undefined) {
	if (params.alg !== undefined) {
	    this.algName = params.alg;
	    if (params.prov === undefined) {
		this.provName = KJUR.crypto.Util.DEFAULTPROVIDER[this.algName];
	    } else {
		this.provName = params.prov;
	    }
	    this.algProvName = this.algName + ":" + this.provName;
	    this.setAlgAndProvider(this.algName, this.provName);
	    this._setAlgNames();
	}

	if (params['psssaltlen'] !== undefined) this.pssSaltLen = params['psssaltlen'];

	if (params.prvkeypem !== undefined) {
	    if (params.prvkeypas !== undefined) {
		throw "both prvkeypem and prvkeypas parameters not supported";
	    } else {
		try {
		    var prvKey = KEYUTIL.getKey(params.prvkeypem);
		    this.init(prvKey);
		} catch (ex) {
		    throw "fatal error to load pem private key: " + ex;
		}
	    }
	}
    }
};

// ====== Cipher class ============================================================
/**
 * Cipher class to encrypt and decrypt data<br/>
 * @name KJUR.crypto.Cipher
 * @class Cipher class to encrypt and decrypt data<br/>
 * @param {Array} params parameters for constructor
 * @since jsrsasign 6.2.0 crypto 1.1.10
 * @description
 * Here is supported canonicalized cipher algorithm names and its standard names:
 * <ul>
 * <li>RSA - RSA/ECB/PKCS1Padding (default for RSAKey)</li>
 * <li>RSAOAEP - RSA/ECB/OAEPWithSHA-1AndMGF1Padding</li>
 * <li>RSAOAEP224 - RSA/ECB/OAEPWithSHA-224AndMGF1Padding(*)</li>
 * <li>RSAOAEP256 - RSA/ECB/OAEPWithSHA-256AndMGF1Padding</li>
 * <li>RSAOAEP384 - RSA/ECB/OAEPWithSHA-384AndMGF1Padding(*)</li>
 * <li>RSAOAEP512 - RSA/ECB/OAEPWithSHA-512AndMGF1Padding(*)</li>
 * </ul>
 * NOTE: (*) is not supported in Java JCE.<br/>
 * Currently this class supports only RSA encryption and decryption. 
 * However it is planning to implement also symmetric ciphers near in the future.
 * @example
 */
KJUR.crypto.Cipher = function(params) {
};

/**
 * encrypt raw string by specified key and algorithm<br/>
 * @name encrypt
 * @memberOf KJUR.crypto.Cipher
 * @function
 * @param {String} s input string to encrypt
 * @param {Object} keyObj RSAKey object or hexadecimal string of symmetric cipher key
 * @param {String} algName short/long algorithm name for encryption/decryption 
 * @return {String} hexadecimal encrypted string
 * @since jsrsasign 6.2.0 crypto 1.1.10
 * @description
 * This static method encrypts raw string with specified key and algorithm.
 * @example 
 * KJUR.crypto.Cipher.encrypt("aaa", pubRSAKeyObj) &rarr; "1abc2d..."
 * KJUR.crypto.Cipher.encrypt("aaa", pubRSAKeyObj, "RSAOAEP") &rarr; "23ab02..."
 */
KJUR.crypto.Cipher.encrypt = function(s, keyObj, algName) {
    if (keyObj instanceof RSAKey && keyObj.isPublic) {
	var algName2 = KJUR.crypto.Cipher.getAlgByKeyAndName(keyObj, algName);
	if (algName2 === "RSA") return keyObj.encrypt(s);
	if (algName2 === "RSAOAEP") return keyObj.encryptOAEP(s, "sha1");

	var a = algName2.match(/^RSAOAEP(\d+)$/);
	if (a !== null) return keyObj.encryptOAEP(s, "sha" + a[1]);

	throw "Cipher.encrypt: unsupported algorithm for RSAKey: " + algName;
    } else {
	throw "Cipher.encrypt: unsupported key or algorithm";
    }
};

/**
 * decrypt encrypted hexadecimal string with specified key and algorithm<br/>
 * @name decrypt
 * @memberOf KJUR.crypto.Cipher
 * @function
 * @param {String} hex hexadecial string of encrypted message
 * @param {Object} keyObj RSAKey object or hexadecimal string of symmetric cipher key
 * @param {String} algName short/long algorithm name for encryption/decryption
 * @return {String} hexadecimal encrypted string
 * @since jsrsasign 6.2.0 crypto 1.1.10
 * @description
 * This static method decrypts encrypted hexadecimal string with specified key and algorithm.
 * @example 
 * KJUR.crypto.Cipher.decrypt("aaa", prvRSAKeyObj) &rarr; "1abc2d..."
 * KJUR.crypto.Cipher.decrypt("aaa", prvRSAKeyObj, "RSAOAEP) &rarr; "23ab02..."
 */
KJUR.crypto.Cipher.decrypt = function(hex, keyObj, algName) {
    if (keyObj instanceof RSAKey && keyObj.isPrivate) {
	var algName2 = KJUR.crypto.Cipher.getAlgByKeyAndName(keyObj, algName);
	if (algName2 === "RSA") return keyObj.decrypt(hex);
	if (algName2 === "RSAOAEP") return keyObj.decryptOAEP(hex, "sha1");

	var a = algName2.match(/^RSAOAEP(\d+)$/);
	if (a !== null) return keyObj.decryptOAEP(hex, "sha" + a[1]);

	throw "Cipher.decrypt: unsupported algorithm for RSAKey: " + algName;
    } else {
	throw "Cipher.decrypt: unsupported key or algorithm";
    }
};

/**
 * get canonicalized encrypt/decrypt algorithm name by key and short/long algorithm name<br/>
 * @name getAlgByKeyAndName
 * @memberOf KJUR.crypto.Cipher
 * @function
 * @param {Object} keyObj RSAKey object or hexadecimal string of symmetric cipher key
 * @param {String} algName short/long algorithm name for encryption/decryption
 * @return {String} canonicalized algorithm name for encryption/decryption
 * @since jsrsasign 6.2.0 crypto 1.1.10
 * @description
 * Here is supported canonicalized cipher algorithm names and its standard names:
 * <ul>
 * <li>RSA - RSA/ECB/PKCS1Padding (default for RSAKey)</li>
 * <li>RSAOAEP - RSA/ECB/OAEPWithSHA-1AndMGF1Padding</li>
 * <li>RSAOAEP224 - RSA/ECB/OAEPWithSHA-224AndMGF1Padding(*)</li>
 * <li>RSAOAEP256 - RSA/ECB/OAEPWithSHA-256AndMGF1Padding</li>
 * <li>RSAOAEP384 - RSA/ECB/OAEPWithSHA-384AndMGF1Padding(*)</li>
 * <li>RSAOAEP512 - RSA/ECB/OAEPWithSHA-512AndMGF1Padding(*)</li>
 * </ul>
 * NOTE: (*) is not supported in Java JCE.
 * @example 
 * KJUR.crypto.Cipher.getAlgByKeyAndName(objRSAKey) &rarr; "RSA"
 * KJUR.crypto.Cipher.getAlgByKeyAndName(objRSAKey, "RSAOAEP") &rarr; "RSAOAEP"
 */
KJUR.crypto.Cipher.getAlgByKeyAndName = function(keyObj, algName) {
    if (keyObj instanceof RSAKey) {
	if (":RSA:RSAOAEP:RSAOAEP224:RSAOAEP256:RSAOAEP384:RSAOAEP512:".indexOf(algName) != -1)
	    return algName;
	if (algName === null || algName === undefined) return "RSA";
	throw "getAlgByKeyAndName: not supported algorithm name for RSAKey: " + algName;
    }
    throw "getAlgByKeyAndName: not supported algorithm name: " + algName;
}

// ====== Other Utility class =====================================================

/**
 * static object for cryptographic function utilities
 * @name KJUR.crypto.OID
 * @class static object for cryptography related OIDs
 * @property {Array} oidhex2name key value of hexadecimal OID and its name
 *           (ex. '2a8648ce3d030107' and 'secp256r1')
 * @since crypto 1.1.3
 * @description
 */
KJUR.crypto.OID = new function() {
    this.oidhex2name = {
	'2a864886f70d010101': 'rsaEncryption',
	'2a8648ce3d0201': 'ecPublicKey',
	'2a8648ce380401': 'dsa',
	'2a8648ce3d030107': 'secp256r1',
	'2b8104001f': 'secp192k1',
	'2b81040021': 'secp224r1',
	'2b8104000a': 'secp256k1',
	'2b81040023': 'secp521r1',
	'2b81040022': 'secp384r1',
	'2a8648ce380403': 'SHA1withDSA', // 1.2.840.10040.4.3
	'608648016503040301': 'SHA224withDSA', // 2.16.840.1.101.3.4.3.1
	'608648016503040302': 'SHA256withDSA', // 2.16.840.1.101.3.4.3.2
    };
};
/* ecdsa-modified-1.1.1.js (c) Stephan Thomas, Kenji Urushima | github.com/bitcoinjs/bitcoinjs-lib/blob/master/LICENSE
 */
/*
 * ecdsa-modified.js - modified Bitcoin.ECDSA class
 * 
 * Copyright (c) 2013-2017 Stefan Thomas (github.com/justmoon)
 *                         Kenji Urushima (kenji.urushima@gmail.com)
 * LICENSE
 *   https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/LICENSE
 */

/**
 * @fileOverview
 * @name ecdsa-modified-1.0.js
 * @author Stefan Thomas (github.com/justmoon) and Kenji Urushima (kenji.urushima@gmail.com)
 * @version jsrsasign 7.2.0 ecdsa-modified 1.1.1 (2017-May-12)
 * @since jsrsasign 4.0
 * @license <a href="https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/LICENSE">MIT License</a>
 */

if (typeof KJUR == "undefined" || !KJUR) KJUR = {};
if (typeof KJUR.crypto == "undefined" || !KJUR.crypto) KJUR.crypto = {};

/**
 * class for EC key generation,  ECDSA signing and verifcation
 * @name KJUR.crypto.ECDSA
 * @class class for EC key generation,  ECDSA signing and verifcation
 * @description
 * <p>
 * CAUTION: Most of the case, you don't need to use this class except
 * for generating an EC key pair. Please use {@link KJUR.crypto.Signature} class instead.
 * </p>
 * <p>
 * This class was originally developped by Stefan Thomas for Bitcoin JavaScript library.
 * (See {@link https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/ecdsa.js})
 * Currently this class supports following named curves and their aliases.
 * <ul>
 * <li>secp256r1, NIST P-256, P-256, prime256v1 (*)</li>
 * <li>secp256k1 (*)</li>
 * <li>secp384r1, NIST P-384, P-384 (*)</li>
 * </ul>
 * </p>
 */
KJUR.crypto.ECDSA = function(params) {
    var curveName = "secp256r1";	// curve name default
    var ecparams = null;
    var prvKeyHex = null;
    var pubKeyHex = null;

    var rng = new SecureRandom();

    var P_OVER_FOUR = null;

    this.type = "EC";
    this.isPrivate = false;
    this.isPublic = false;

    function implShamirsTrick(P, k, Q, l) {
	var m = Math.max(k.bitLength(), l.bitLength());
	var Z = P.add2D(Q);
	var R = P.curve.getInfinity();

	for (var i = m - 1; i >= 0; --i) {
	    R = R.twice2D();

	    R.z = BigInteger.ONE;

	    if (k.testBit(i)) {
		if (l.testBit(i)) {
		    R = R.add2D(Z);
		} else {
		    R = R.add2D(P);
		}
	    } else {
		if (l.testBit(i)) {
		    R = R.add2D(Q);
		}
	    }
	}
	
	return R;
    };

    //===========================
    // PUBLIC METHODS
    //===========================
    this.getBigRandom = function (limit) {
	return new BigInteger(limit.bitLength(), rng)
	.mod(limit.subtract(BigInteger.ONE))
	.add(BigInteger.ONE)
	;
    };

    this.setNamedCurve = function(curveName) {
	this.ecparams = KJUR.crypto.ECParameterDB.getByName(curveName);
	this.prvKeyHex = null;
	this.pubKeyHex = null;
	this.curveName = curveName;
    };

    this.setPrivateKeyHex = function(prvKeyHex) {
        this.isPrivate = true;
	this.prvKeyHex = prvKeyHex;
    };

    this.setPublicKeyHex = function(pubKeyHex) {
        this.isPublic = true;
	this.pubKeyHex = pubKeyHex;
    };

    /**
     * get X and Y hexadecimal string value of public key
     * @name getPublicKeyXYHex
     * @memberOf KJUR.crypto.ECDSA#
     * @function
     * @return {Array} associative array of x and y value of public key
     * @since ecdsa-modified 1.0.5 jsrsasign 5.0.14
     * @example
     * ec = new KJUR.crypto.ECDSA({'curve': 'secp256r1', 'pub': pubHex});
     * ec.getPublicKeyXYHex() &rarr; { x: '01bacf...', y: 'c3bc22...' }
     */
    this.getPublicKeyXYHex = function() {
	var h = this.pubKeyHex;
	if (h.substr(0, 2) !== "04")
	    throw "this method supports uncompressed format(04) only";

	var charlen = this.ecparams.keylen / 4;
	if (h.length !== 2 + charlen * 2)
	    throw "malformed public key hex length";

	var result = {};
	result.x = h.substr(2, charlen);
	result.y = h.substr(2 + charlen);
	return result;
    };

    /**
     * get NIST curve short name such as "P-256" or "P-384"
     * @name getShortNISTPCurveName
     * @memberOf KJUR.crypto.ECDSA#
     * @function
     * @return {String} short NIST P curve name such as "P-256" or "P-384" if it's NIST P curve otherwise null;
     * @since ecdsa-modified 1.0.5 jsrsasign 5.0.14
     * @example
     * ec = new KJUR.crypto.ECDSA({'curve': 'secp256r1', 'pub': pubHex});
     * ec.getShortPCurveName() &rarr; "P-256";
     */
    this.getShortNISTPCurveName = function() {
	var s = this.curveName;
	if (s === "secp256r1" || s === "NIST P-256" ||
	    s === "P-256" || s === "prime256v1")
	    return "P-256";
	if (s === "secp384r1" || s === "NIST P-384" || s === "P-384")
	    return "P-384";
	return null;
    };

    /**
     * generate a EC key pair
     * @name generateKeyPairHex
     * @memberOf KJUR.crypto.ECDSA#
     * @function
     * @return {Array} associative array of hexadecimal string of private and public key
     * @since ecdsa-modified 1.0.1
     * @example
     * var ec = new KJUR.crypto.ECDSA({'curve': 'secp256r1'});
     * var keypair = ec.generateKeyPairHex();
     * var pubhex = keypair.ecpubhex; // hexadecimal string of EC public key
     * var prvhex = keypair.ecprvhex; // hexadecimal string of EC private key (=d)
     */
    this.generateKeyPairHex = function() {
	var biN = this.ecparams['n'];
	var biPrv = this.getBigRandom(biN);
	var epPub = this.ecparams['G'].multiply(biPrv);
	var biX = epPub.getX().toBigInteger();
	var biY = epPub.getY().toBigInteger();

	var charlen = this.ecparams['keylen'] / 4;
	var hPrv = ("0000000000" + biPrv.toString(16)).slice(- charlen);
	var hX   = ("0000000000" + biX.toString(16)).slice(- charlen);
	var hY   = ("0000000000" + biY.toString(16)).slice(- charlen);
	var hPub = "04" + hX + hY;

	this.setPrivateKeyHex(hPrv);
	this.setPublicKeyHex(hPub);
	return {'ecprvhex': hPrv, 'ecpubhex': hPub};
    };

    this.signWithMessageHash = function(hashHex) {
	return this.signHex(hashHex, this.prvKeyHex);
    };

    /**
     * signing to message hash
     * @name signHex
     * @memberOf KJUR.crypto.ECDSA#
     * @function
     * @param {String} hashHex hexadecimal string of hash value of signing message
     * @param {String} privHex hexadecimal string of EC private key
     * @return {String} hexadecimal string of ECDSA signature
     * @since ecdsa-modified 1.0.1
     * @example
     * var ec = new KJUR.crypto.ECDSA({'curve': 'secp256r1'});
     * var sigValue = ec.signHex(hash, prvKey);
     */
    this.signHex = function (hashHex, privHex) {
	var d = new BigInteger(privHex, 16);
	var n = this.ecparams['n'];
	var e = new BigInteger(hashHex, 16);

	do {
	    var k = this.getBigRandom(n);
	    var G = this.ecparams['G'];
	    var Q = G.multiply(k);
	    var r = Q.getX().toBigInteger().mod(n);
	} while (r.compareTo(BigInteger.ZERO) <= 0);

	var s = k.modInverse(n).multiply(e.add(d.multiply(r))).mod(n);

	return KJUR.crypto.ECDSA.biRSSigToASN1Sig(r, s);
    };

    this.sign = function (hash, priv) {
	var d = priv;
	var n = this.ecparams['n'];
	var e = BigInteger.fromByteArrayUnsigned(hash);

	do {
	    var k = this.getBigRandom(n);
	    var G = this.ecparams['G'];
	    var Q = G.multiply(k);
	    var r = Q.getX().toBigInteger().mod(n);
	} while (r.compareTo(BigInteger.ZERO) <= 0);

	var s = k.modInverse(n).multiply(e.add(d.multiply(r))).mod(n);
	return this.serializeSig(r, s);
    };

    this.verifyWithMessageHash = function(hashHex, sigHex) {
	return this.verifyHex(hashHex, sigHex, this.pubKeyHex);
    };

    /**
     * verifying signature with message hash and public key
     * @name verifyHex
     * @memberOf KJUR.crypto.ECDSA#
     * @function
     * @param {String} hashHex hexadecimal string of hash value of signing message
     * @param {String} sigHex hexadecimal string of signature value
     * @param {String} pubkeyHex hexadecimal string of public key
     * @return {Boolean} true if the signature is valid, otherwise false
     * @since ecdsa-modified 1.0.1
     * @example
     * var ec = new KJUR.crypto.ECDSA({'curve': 'secp256r1'});
     * var result = ec.verifyHex(msgHashHex, sigHex, pubkeyHex);
     */
    this.verifyHex = function(hashHex, sigHex, pubkeyHex) {
	var r,s;

	var obj = KJUR.crypto.ECDSA.parseSigHex(sigHex);
	r = obj.r;
	s = obj.s;

	var Q;
	Q = ECPointFp.decodeFromHex(this.ecparams['curve'], pubkeyHex);
	var e = new BigInteger(hashHex, 16);

	return this.verifyRaw(e, r, s, Q);
    };

    this.verify = function (hash, sig, pubkey) {
	var r,s;
	if (Bitcoin.Util.isArray(sig)) {
	    var obj = this.parseSig(sig);
	    r = obj.r;
	    s = obj.s;
	} else if ("object" === typeof sig && sig.r && sig.s) {
	    r = sig.r;
	    s = sig.s;
	} else {
	    throw "Invalid value for signature";
	}

	var Q;
	if (pubkey instanceof ECPointFp) {
	    Q = pubkey;
	} else if (Bitcoin.Util.isArray(pubkey)) {
	    Q = ECPointFp.decodeFrom(this.ecparams['curve'], pubkey);
	} else {
	    throw "Invalid format for pubkey value, must be byte array or ECPointFp";
	}
	var e = BigInteger.fromByteArrayUnsigned(hash);

	return this.verifyRaw(e, r, s, Q);
    };

    this.verifyRaw = function (e, r, s, Q) {
	var n = this.ecparams['n'];
	var G = this.ecparams['G'];

	if (r.compareTo(BigInteger.ONE) < 0 ||
	    r.compareTo(n) >= 0)
	    return false;

	if (s.compareTo(BigInteger.ONE) < 0 ||
	    s.compareTo(n) >= 0)
	    return false;

	var c = s.modInverse(n);

	var u1 = e.multiply(c).mod(n);
	var u2 = r.multiply(c).mod(n);

	// TODO(!!!): For some reason Shamir's trick isn't working with
	// signed message verification!? Probably an implementation
	// error!
	//var point = implShamirsTrick(G, u1, Q, u2);
	var point = G.multiply(u1).add(Q.multiply(u2));

	var v = point.getX().toBigInteger().mod(n);

	return v.equals(r);
    };

    /**
     * Serialize a signature into DER format.
     *
     * Takes two BigIntegers representing r and s and returns a byte array.
     */
    this.serializeSig = function (r, s) {
	var rBa = r.toByteArraySigned();
	var sBa = s.toByteArraySigned();

	var sequence = [];
	sequence.push(0x02); // INTEGER
	sequence.push(rBa.length);
	sequence = sequence.concat(rBa);

	sequence.push(0x02); // INTEGER
	sequence.push(sBa.length);
	sequence = sequence.concat(sBa);

	sequence.unshift(sequence.length);
	sequence.unshift(0x30); // SEQUENCE
	return sequence;
    };

    /**
     * Parses a byte array containing a DER-encoded signature.
     *
     * This function will return an object of the form:
     *
     * {
     *   r: BigInteger,
     *   s: BigInteger
     * }
     */
    this.parseSig = function (sig) {
	var cursor;
	if (sig[0] != 0x30)
	    throw new Error("Signature not a valid DERSequence");

	cursor = 2;
	if (sig[cursor] != 0x02)
	    throw new Error("First element in signature must be a DERInteger");;
	var rBa = sig.slice(cursor+2, cursor+2+sig[cursor+1]);

	cursor += 2+sig[cursor+1];
	if (sig[cursor] != 0x02)
	    throw new Error("Second element in signature must be a DERInteger");
	var sBa = sig.slice(cursor+2, cursor+2+sig[cursor+1]);

	cursor += 2+sig[cursor+1];

	//if (cursor != sig.length)
	//  throw new Error("Extra bytes in signature");

	var r = BigInteger.fromByteArrayUnsigned(rBa);
	var s = BigInteger.fromByteArrayUnsigned(sBa);

	return {r: r, s: s};
    };

    this.parseSigCompact = function (sig) {
	if (sig.length !== 65) {
	    throw "Signature has the wrong length";
	}

	// Signature is prefixed with a type byte storing three bits of
	// information.
	var i = sig[0] - 27;
	if (i < 0 || i > 7) {
	    throw "Invalid signature type";
	}

	var n = this.ecparams['n'];
	var r = BigInteger.fromByteArrayUnsigned(sig.slice(1, 33)).mod(n);
	var s = BigInteger.fromByteArrayUnsigned(sig.slice(33, 65)).mod(n);

	return {r: r, s: s, i: i};
    };

    /**
     * read an ASN.1 hexadecimal string of PKCS#1/5 plain ECC private key<br/>
     * @name readPKCS5PrvKeyHex
     * @memberOf KJUR.crypto.ECDSA#
     * @function
     * @param {String} h hexadecimal string of PKCS#1/5 ECC private key
     * @since jsrsasign 7.1.0 ecdsa-modified 1.1.0
     */
    this.readPKCS5PrvKeyHex = function(h) {
	var _ASN1HEX = ASN1HEX;
	var _getName = KJUR.crypto.ECDSA.getName;
	var _getVbyList = _ASN1HEX.getVbyList;

	if (_ASN1HEX.isASN1HEX(h) === false)
	    throw "not ASN.1 hex string";

	var hCurve, hPrv, hPub;
	try {
	    hCurve = _getVbyList(h, 0, [2, 0], "06");
	    hPrv   = _getVbyList(h, 0, [1], "04");
	    try {
		hPub = _getVbyList(h, 0, [3, 0], "03").substr(2);
	    } catch(ex) {};
	} catch(ex) {
	    throw "malformed PKCS#1/5 plain ECC private key";
	}

	this.curveName = _getName(hCurve);
	if (this.curveName === undefined) throw "unsupported curve name";

	this.setNamedCurve(this.curveName);
	this.setPublicKeyHex(hPub);
	this.setPrivateKeyHex(hPrv);
        this.isPublic = false;
    };

    /**
     * read an ASN.1 hexadecimal string of PKCS#8 plain ECC private key<br/>
     * @name readPKCS8PrvKeyHex
     * @memberOf KJUR.crypto.ECDSA#
     * @function
     * @param {String} h hexadecimal string of PKCS#8 ECC private key
     * @since jsrsasign 7.1.0 ecdsa-modified 1.1.0
     */
    this.readPKCS8PrvKeyHex = function(h) {
	var _ASN1HEX = ASN1HEX;
	var _getName = KJUR.crypto.ECDSA.getName;
	var _getVbyList = _ASN1HEX.getVbyList;

	if (_ASN1HEX.isASN1HEX(h) === false)
	    throw "not ASN.1 hex string";

	var hECOID, hCurve, hPrv, hPub;
	try {
	    hECOID = _getVbyList(h, 0, [1, 0], "06");
	    hCurve = _getVbyList(h, 0, [1, 1], "06");
	    hPrv   = _getVbyList(h, 0, [2, 0, 1], "04");
	    try {
		hPub = _getVbyList(h, 0, [2, 0, 2, 0], "03").substr(2);
	    } catch(ex) {};
	} catch(ex) {
	    throw "malformed PKCS#8 plain ECC private key";
	}

	this.curveName = _getName(hCurve);
	if (this.curveName === undefined) throw "unsupported curve name";

	this.setNamedCurve(this.curveName);
	this.setPublicKeyHex(hPub);
	this.setPrivateKeyHex(hPrv);
        this.isPublic = false;
    };

    /**
     * read an ASN.1 hexadecimal string of PKCS#8 ECC public key<br/>
     * @name readPKCS8PubKeyHex
     * @memberOf KJUR.crypto.ECDSA#
     * @function
     * @param {String} h hexadecimal string of PKCS#8 ECC public key
     * @since jsrsasign 7.1.0 ecdsa-modified 1.1.0
     */
    this.readPKCS8PubKeyHex = function(h) {
	var _ASN1HEX = ASN1HEX;
	var _getName = KJUR.crypto.ECDSA.getName;
	var _getVbyList = _ASN1HEX.getVbyList;

	if (_ASN1HEX.isASN1HEX(h) === false)
	    throw "not ASN.1 hex string";

	var hECOID, hCurve, hPub;
	try {
	    hECOID = _getVbyList(h, 0, [0, 0], "06");
	    hCurve = _getVbyList(h, 0, [0, 1], "06");
	    hPub = _getVbyList(h, 0, [1], "03").substr(2);
	} catch(ex) {
	    throw "malformed PKCS#8 ECC public key";
	}

	this.curveName = _getName(hCurve);
	if (this.curveName === null) throw "unsupported curve name";

	this.setNamedCurve(this.curveName);
	this.setPublicKeyHex(hPub);
    };

    /**
     * read an ASN.1 hexadecimal string of X.509 ECC public key certificate<br/>
     * @name readCertPubKeyHex
     * @memberOf KJUR.crypto.ECDSA#
     * @function
     * @param {String} h hexadecimal string of X.509 ECC public key certificate
     * @param {Integer} nthPKI nth index of publicKeyInfo. (DEFAULT: 6 for X509v3)
     * @since jsrsasign 7.1.0 ecdsa-modified 1.1.0
     */
    this.readCertPubKeyHex = function(h, nthPKI) {
	if (nthPKI !== 5) nthPKI = 6;
	var _ASN1HEX = ASN1HEX;
	var _getName = KJUR.crypto.ECDSA.getName;
	var _getVbyList = _ASN1HEX.getVbyList;

	if (_ASN1HEX.isASN1HEX(h) === false)
	    throw "not ASN.1 hex string";

	var hCurve, hPub;
	try {
	    hCurve = _getVbyList(h, 0, [0, nthPKI, 0, 1], "06");
	    hPub = _getVbyList(h, 0, [0, nthPKI, 1], "03").substr(2);
	} catch(ex) {
	    throw "malformed X.509 certificate ECC public key";
	}

	this.curveName = _getName(hCurve);
	if (this.curveName === null) throw "unsupported curve name";

	this.setNamedCurve(this.curveName);
	this.setPublicKeyHex(hPub);
    };

    /*
     * Recover a public key from a signature.
     *
     * See SEC 1: Elliptic Curve Cryptography, section 4.1.6, "Public
     * Key Recovery Operation".
     *
     * http://www.secg.org/download/aid-780/sec1-v2.pdf
     */
    /*
    recoverPubKey: function (r, s, hash, i) {
	// The recovery parameter i has two bits.
	i = i & 3;

	// The less significant bit specifies whether the y coordinate
	// of the compressed point is even or not.
	var isYEven = i & 1;

	// The more significant bit specifies whether we should use the
	// first or second candidate key.
	var isSecondKey = i >> 1;

	var n = this.ecparams['n'];
	var G = this.ecparams['G'];
	var curve = this.ecparams['curve'];
	var p = curve.getQ();
	var a = curve.getA().toBigInteger();
	var b = curve.getB().toBigInteger();

	// We precalculate (p + 1) / 4 where p is if the field order
	if (!P_OVER_FOUR) {
	    P_OVER_FOUR = p.add(BigInteger.ONE).divide(BigInteger.valueOf(4));
	}

	// 1.1 Compute x
	var x = isSecondKey ? r.add(n) : r;

	// 1.3 Convert x to point
	var alpha = x.multiply(x).multiply(x).add(a.multiply(x)).add(b).mod(p);
	var beta = alpha.modPow(P_OVER_FOUR, p);

	var xorOdd = beta.isEven() ? (i % 2) : ((i+1) % 2);
	// If beta is even, but y isn't or vice versa, then convert it,
	// otherwise we're done and y == beta.
	var y = (beta.isEven() ? !isYEven : isYEven) ? beta : p.subtract(beta);

	// 1.4 Check that nR is at infinity
	var R = new ECPointFp(curve,
			      curve.fromBigInteger(x),
			      curve.fromBigInteger(y));
	R.validate();

	// 1.5 Compute e from M
	var e = BigInteger.fromByteArrayUnsigned(hash);
	var eNeg = BigInteger.ZERO.subtract(e).mod(n);

	// 1.6 Compute Q = r^-1 (sR - eG)
	var rInv = r.modInverse(n);
	var Q = implShamirsTrick(R, s, G, eNeg).multiply(rInv);

	Q.validate();
	if (!this.verifyRaw(e, r, s, Q)) {
	    throw "Pubkey recovery unsuccessful";
	}

	var pubKey = new Bitcoin.ECKey();
	pubKey.pub = Q;
	return pubKey;
    },
    */

    /*
     * Calculate pubkey extraction parameter.
     *
     * When extracting a pubkey from a signature, we have to
     * distinguish four different cases. Rather than putting this
     * burden on the verifier, Bitcoin includes a 2-bit value with the
     * signature.
     *
     * This function simply tries all four cases and returns the value
     * that resulted in a successful pubkey recovery.
     */
    /*
    calcPubkeyRecoveryParam: function (address, r, s, hash) {
	for (var i = 0; i < 4; i++) {
	    try {
		var pubkey = Bitcoin.ECDSA.recoverPubKey(r, s, hash, i);
		if (pubkey.getBitcoinAddress().toString() == address) {
		    return i;
		}
	    } catch (e) {}
	}
	throw "Unable to find valid recovery factor";
    }
    */

    if (params !== undefined) {
	if (params['curve'] !== undefined) {
	    this.curveName = params['curve'];
	}
    }
    if (this.curveName === undefined) this.curveName = curveName;
    this.setNamedCurve(this.curveName);
    if (params !== undefined) {
	if (params.prv !== undefined) this.setPrivateKeyHex(params.prv);
	if (params.pub !== undefined) this.setPublicKeyHex(params.pub);
    }
};

/**
 * parse ASN.1 DER encoded ECDSA signature
 * @name parseSigHex
 * @memberOf KJUR.crypto.ECDSA
 * @function
 * @static
 * @param {String} sigHex hexadecimal string of ECDSA signature value
 * @return {Array} associative array of signature field r and s of BigInteger
 * @since ecdsa-modified 1.0.1
 * @example
 * var ec = new KJUR.crypto.ECDSA({'curve': 'secp256r1'});
 * var sig = ec.parseSigHex('30...');
 * var biR = sig.r; // BigInteger object for 'r' field of signature.
 * var biS = sig.s; // BigInteger object for 's' field of signature.
 */
KJUR.crypto.ECDSA.parseSigHex = function(sigHex) {
    var p = KJUR.crypto.ECDSA.parseSigHexInHexRS(sigHex);
    var biR = new BigInteger(p.r, 16);
    var biS = new BigInteger(p.s, 16);
    
    return {'r': biR, 's': biS};
};

/**
 * parse ASN.1 DER encoded ECDSA signature
 * @name parseSigHexInHexRS
 * @memberOf KJUR.crypto.ECDSA
 * @function
 * @static
 * @param {String} sigHex hexadecimal string of ECDSA signature value
 * @return {Array} associative array of signature field r and s in hexadecimal
 * @since ecdsa-modified 1.0.3
 * @example
 * var ec = new KJUR.crypto.ECDSA({'curve': 'secp256r1'});
 * var sig = ec.parseSigHexInHexRS('30...');
 * var hR = sig.r; // hexadecimal string for 'r' field of signature.
 * var hS = sig.s; // hexadecimal string for 's' field of signature.
 */
KJUR.crypto.ECDSA.parseSigHexInHexRS = function(sigHex) {
    var _ASN1HEX = ASN1HEX;
    var _getChildIdx = _ASN1HEX.getChildIdx;
    var _getV = _ASN1HEX.getV;

    // 1. ASN.1 Sequence Check
    if (sigHex.substr(0, 2) != "30")
	throw "signature is not a ASN.1 sequence";

    // 2. Items of ASN.1 Sequence Check
    var a = _getChildIdx(sigHex, 0);
    if (a.length != 2)
	throw "number of signature ASN.1 sequence elements seem wrong";
    
    // 3. Integer check
    var iTLV1 = a[0];
    var iTLV2 = a[1];
    if (sigHex.substr(iTLV1, 2) != "02")
	throw "1st item of sequene of signature is not ASN.1 integer";
    if (sigHex.substr(iTLV2, 2) != "02")
	throw "2nd item of sequene of signature is not ASN.1 integer";

    // 4. getting value
    var hR = _getV(sigHex, iTLV1);
    var hS = _getV(sigHex, iTLV2);
    
    return {'r': hR, 's': hS};
};

/**
 * convert hexadecimal ASN.1 encoded signature to concatinated signature
 * @name asn1SigToConcatSig
 * @memberOf KJUR.crypto.ECDSA
 * @function
 * @static
 * @param {String} asn1Hex hexadecimal string of ASN.1 encoded ECDSA signature value
 * @return {String} r-s concatinated format of ECDSA signature value
 * @since ecdsa-modified 1.0.3
 */
KJUR.crypto.ECDSA.asn1SigToConcatSig = function(asn1Sig) {
    var pSig = KJUR.crypto.ECDSA.parseSigHexInHexRS(asn1Sig);
    var hR = pSig.r;
    var hS = pSig.s;

    // R and S length is assumed multiple of 128bit(32chars in hex).
    // If leading is "00" and modulo of length is 2(chars) then
    // leading "00" is for two's complement and will be removed.
    if (hR.substr(0, 2) == "00" && (hR.length % 32) == 2)
	hR = hR.substr(2);

    if (hS.substr(0, 2) == "00" && (hS.length % 32) == 2)
	hS = hS.substr(2);

    // R and S length is assumed multiple of 128bit(32chars in hex).
    // If missing two chars then it will be padded by "00".
    if ((hR.length % 32) == 30) hR = "00" + hR;
    if ((hS.length % 32) == 30) hS = "00" + hS;

    // If R and S length is not still multiple of 128bit(32 chars),
    // then error
    if (hR.length % 32 != 0)
	throw "unknown ECDSA sig r length error";
    if (hS.length % 32 != 0)
	throw "unknown ECDSA sig s length error";

    return hR + hS;
};

/**
 * convert hexadecimal concatinated signature to ASN.1 encoded signature
 * @name concatSigToASN1Sig
 * @memberOf KJUR.crypto.ECDSA
 * @function
 * @static
 * @param {String} concatSig r-s concatinated format of ECDSA signature value
 * @return {String} hexadecimal string of ASN.1 encoded ECDSA signature value
 * @since ecdsa-modified 1.0.3
 */
KJUR.crypto.ECDSA.concatSigToASN1Sig = function(concatSig) {
    if ((((concatSig.length / 2) * 8) % (16 * 8)) != 0)
	throw "unknown ECDSA concatinated r-s sig  length error";

    var hR = concatSig.substr(0, concatSig.length / 2);
    var hS = concatSig.substr(concatSig.length / 2);
    return KJUR.crypto.ECDSA.hexRSSigToASN1Sig(hR, hS);
};

/**
 * convert hexadecimal R and S value of signature to ASN.1 encoded signature
 * @name hexRSSigToASN1Sig
 * @memberOf KJUR.crypto.ECDSA
 * @function
 * @static
 * @param {String} hR hexadecimal string of R field of ECDSA signature value
 * @param {String} hS hexadecimal string of S field of ECDSA signature value
 * @return {String} hexadecimal string of ASN.1 encoded ECDSA signature value
 * @since ecdsa-modified 1.0.3
 */
KJUR.crypto.ECDSA.hexRSSigToASN1Sig = function(hR, hS) {
    var biR = new BigInteger(hR, 16);
    var biS = new BigInteger(hS, 16);
    return KJUR.crypto.ECDSA.biRSSigToASN1Sig(biR, biS);
};

/**
 * convert R and S BigInteger object of signature to ASN.1 encoded signature
 * @name biRSSigToASN1Sig
 * @memberOf KJUR.crypto.ECDSA
 * @function
 * @static
 * @param {BigInteger} biR BigInteger object of R field of ECDSA signature value
 * @param {BigInteger} biS BIgInteger object of S field of ECDSA signature value
 * @return {String} hexadecimal string of ASN.1 encoded ECDSA signature value
 * @since ecdsa-modified 1.0.3
 */
KJUR.crypto.ECDSA.biRSSigToASN1Sig = function(biR, biS) {
    var _KJUR_asn1 = KJUR.asn1;
    var derR = new _KJUR_asn1.DERInteger({'bigint': biR});
    var derS = new _KJUR_asn1.DERInteger({'bigint': biS});
    var derSeq = new _KJUR_asn1.DERSequence({'array': [derR, derS]});
    return derSeq.getEncodedHex();
};

/**
 * static method to get normalized EC curve name from curve name or hexadecimal OID value
 * @name getName
 * @memberOf KJUR.crypto.ECDSA
 * @function
 * @static
 * @param {String} s curve name (ex. P-256) or hexadecimal OID value (ex. 2a86...)
 * @return {String} normalized EC curve name (ex. secp256r1) 
 * @since jsrsasign 7.1.0 ecdsa-modified 1.1.0 
 * @description
 * This static method returns normalized EC curve name 
 * which is supported in jsrsasign
 * from curve name or hexadecimal OID value.
 * When curve is not supported in jsrsasign, this method returns null.
 * Normalized name will be "secp*" in jsrsasign.
 * @example
 * KJUR.crypto.ECDSA.getName("2b8104000a") &rarr; "secp256k1"
 * KJUR.crypto.ECDSA.getName("NIST P-256") &rarr; "secp256r1"
 * KJUR.crypto.ECDSA.getName("P-521") &rarr; undefined // not supported
 */
KJUR.crypto.ECDSA.getName = function(s) {
    if (s === "2a8648ce3d030107") return "secp256r1"; // 1.2.840.10045.3.1.7
    if (s === "2b8104000a") return "secp256k1"; // 1.3.132.0.10
    if (s === "2b81040022") return "secp384r1"; // 1.3.132.0.34
    if ("|secp256r1|NIST P-256|P-256|prime256v1|".indexOf(s) !== -1) return "secp256r1";
    if ("|secp256k1|".indexOf(s) !== -1) return "secp256k1";
    if ("|secp384r1|NIST P-384|P-384|".indexOf(s) !== -1) return "secp384r1";
    return null;
};

/* ecparam-1.0.0.js (c) 2013 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * ecparam.js - Elliptic Curve Cryptography Curve Parameter Definition class
 *
 * Copyright (c) 2013 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name ecparam-1.1.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version 1.0.0 (2013-Jul-17)
 * @since jsrsasign 4.0
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

if (typeof KJUR == "undefined" || !KJUR) KJUR = {};
if (typeof KJUR.crypto == "undefined" || !KJUR.crypto) KJUR.crypto = {};

/**
 * static object for elliptic curve names and parameters
 * @name KJUR.crypto.ECParameterDB
 * @class static object for elliptic curve names and parameters
 * @description
 * This class provides parameters for named elliptic curves.
 * Currently it supoprts following curve names and aliases however 
 * the name marked (*) are available for {@link KJUR.crypto.ECDSA} and
 * {@link KJUR.crypto.Signature} classes.
 * <ul>
 * <li>secp128r1</li>
 * <li>secp160r1</li>
 * <li>secp160k1</li>
 * <li>secp192r1</li>
 * <li>secp192k1</li>
 * <li>secp224r1</li>
 * <li>secp256r1, NIST P-256, P-256, prime256v1 (*)</li>
 * <li>secp256k1 (*)</li>
 * <li>secp384r1, NIST P-384, P-384 (*)</li>
 * <li>secp521r1, NIST P-521, P-521</li>
 * </ul>
 * You can register new curves by using 'register' method.
 */
KJUR.crypto.ECParameterDB = new function() {
    var db = {};
    var aliasDB = {};

    function hex2bi(hex) {
        return new BigInteger(hex, 16);
    }
    
    /**
     * get curve inforamtion associative array for curve name or alias
     * @name getByName
     * @memberOf KJUR.crypto.ECParameterDB
     * @function
     * @param {String} nameOrAlias curve name or alias name
     * @return {Array} associative array of curve parameters
     * @example
     * var param = KJUR.crypto.ECParameterDB.getByName('prime256v1');
     * var keylen = param['keylen'];
     * var n = param['n'];
     */
    this.getByName = function(nameOrAlias) {
	var name = nameOrAlias;
	if (typeof aliasDB[name] != "undefined") {
	    name = aliasDB[nameOrAlias];
        }
	if (typeof db[name] != "undefined") {
	    return db[name];
	}
	throw "unregistered EC curve name: " + name;
    };

    /**
     * register new curve
     * @name regist
     * @memberOf KJUR.crypto.ECParameterDB
     * @function
     * @param {String} name name of curve
     * @param {Integer} keylen key length
     * @param {String} pHex hexadecimal value of p
     * @param {String} aHex hexadecimal value of a
     * @param {String} bHex hexadecimal value of b
     * @param {String} nHex hexadecimal value of n
     * @param {String} hHex hexadecimal value of h
     * @param {String} gxHex hexadecimal value of Gx
     * @param {String} gyHex hexadecimal value of Gy
     * @param {Array} aliasList array of string for curve names aliases
     * @param {String} oid Object Identifier for the curve
     * @param {String} info information string for the curve
     */
    this.regist = function(name, keylen, pHex, aHex, bHex, nHex, hHex, gxHex, gyHex, aliasList, oid, info) {
        db[name] = {};
	var p = hex2bi(pHex);
	var a = hex2bi(aHex);
	var b = hex2bi(bHex);
	var n = hex2bi(nHex);
	var h = hex2bi(hHex);
        var curve = new ECCurveFp(p, a, b);
        var G = curve.decodePointHex("04" + gxHex + gyHex);
	db[name]['name'] = name;
	db[name]['keylen'] = keylen;
        db[name]['curve'] = curve;
        db[name]['G'] = G;
        db[name]['n'] = n;
        db[name]['h'] = h;
        db[name]['oid'] = oid;
        db[name]['info'] = info;

        for (var i = 0; i < aliasList.length; i++) {
	    aliasDB[aliasList[i]] = name;
        }
    };
};

KJUR.crypto.ECParameterDB.regist(
  "secp128r1", // name / p = 2^128 - 2^97 - 1
  128,
  "FFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFF", // p
  "FFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFC", // a
  "E87579C11079F43DD824993C2CEE5ED3", // b
  "FFFFFFFE0000000075A30D1B9038A115", // n
  "1", // h
  "161FF7528B899B2D0C28607CA52C5B86", // gx
  "CF5AC8395BAFEB13C02DA292DDED7A83", // gy
  [], // alias
  "", // oid (underconstruction)
  "secp128r1 : SECG curve over a 128 bit prime field"); // info

KJUR.crypto.ECParameterDB.regist(
  "secp160k1", // name / p = 2^160 - 2^32 - 2^14 - 2^12 - 2^9 - 2^8 - 2^7 - 2^3 - 2^2 - 1
  160,
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFAC73", // p
  "0", // a
  "7", // b
  "0100000000000000000001B8FA16DFAB9ACA16B6B3", // n
  "1", // h
  "3B4C382CE37AA192A4019E763036F4F5DD4D7EBB", // gx
  "938CF935318FDCED6BC28286531733C3F03C4FEE", // gy
  [], // alias
  "", // oid
  "secp160k1 : SECG curve over a 160 bit prime field"); // info

KJUR.crypto.ECParameterDB.regist(
  "secp160r1", // name / p = 2^160 - 2^31 - 1
  160,
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFF", // p
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFC", // a
  "1C97BEFC54BD7A8B65ACF89F81D4D4ADC565FA45", // b
  "0100000000000000000001F4C8F927AED3CA752257", // n
  "1", // h
  "4A96B5688EF573284664698968C38BB913CBFC82", // gx
  "23A628553168947D59DCC912042351377AC5FB32", // gy
  [], // alias
  "", // oid
  "secp160r1 : SECG curve over a 160 bit prime field"); // info

KJUR.crypto.ECParameterDB.regist(
  "secp192k1", // name / p = 2^192 - 2^32 - 2^12 - 2^8 - 2^7 - 2^6 - 2^3 - 1
  192,
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFEE37", // p
  "0", // a
  "3", // b
  "FFFFFFFFFFFFFFFFFFFFFFFE26F2FC170F69466A74DEFD8D", // n
  "1", // h
  "DB4FF10EC057E9AE26B07D0280B7F4341DA5D1B1EAE06C7D", // gx
  "9B2F2F6D9C5628A7844163D015BE86344082AA88D95E2F9D", // gy
  []); // alias

KJUR.crypto.ECParameterDB.regist(
  "secp192r1", // name / p = 2^192 - 2^64 - 1
  192,
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFF", // p
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFC", // a
  "64210519E59C80E70FA7E9AB72243049FEB8DEECC146B9B1", // b
  "FFFFFFFFFFFFFFFFFFFFFFFF99DEF836146BC9B1B4D22831", // n
  "1", // h
  "188DA80EB03090F67CBF20EB43A18800F4FF0AFD82FF1012", // gx
  "07192B95FFC8DA78631011ED6B24CDD573F977A11E794811", // gy
  []); // alias

KJUR.crypto.ECParameterDB.regist(
  "secp224r1", // name / p = 2^224 - 2^96 + 1
  224,
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000001", // p
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFE", // a
  "B4050A850C04B3ABF54132565044B0B7D7BFD8BA270B39432355FFB4", // b
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFF16A2E0B8F03E13DD29455C5C2A3D", // n
  "1", // h
  "B70E0CBD6BB4BF7F321390B94A03C1D356C21122343280D6115C1D21", // gx
  "BD376388B5F723FB4C22DFE6CD4375A05A07476444D5819985007E34", // gy
  []); // alias

KJUR.crypto.ECParameterDB.regist(
  "secp256k1", // name / p = 2^256 - 2^32 - 2^9 - 2^8 - 2^7 - 2^6 - 2^4 - 1
  256,
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F", // p
  "0", // a
  "7", // b
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", // n
  "1", // h
  "79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", // gx
  "483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8", // gy
  []); // alias

KJUR.crypto.ECParameterDB.regist(
  "secp256r1", // name / p = 2^224 (2^32 - 1) + 2^192 + 2^96 - 1
  256,
  "FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF", // p
  "FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC", // a
  "5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B", // b
  "FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551", // n
  "1", // h
  "6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296", // gx
  "4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5", // gy
  ["NIST P-256", "P-256", "prime256v1"]); // alias

KJUR.crypto.ECParameterDB.regist(
  "secp384r1", // name
  384,
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFF0000000000000000FFFFFFFF", // p
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFF0000000000000000FFFFFFFC", // a
  "B3312FA7E23EE7E4988E056BE3F82D19181D9C6EFE8141120314088F5013875AC656398D8A2ED19D2A85C8EDD3EC2AEF", // b
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC7634D81F4372DDF581A0DB248B0A77AECEC196ACCC52973", // n
  "1", // h
  "AA87CA22BE8B05378EB1C71EF320AD746E1D3B628BA79B9859F741E082542A385502F25DBF55296C3A545E3872760AB7", // gx
  "3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c00a60b1ce1d7e819d7a431d7c90ea0e5f", // gy
  ["NIST P-384", "P-384"]); // alias

KJUR.crypto.ECParameterDB.regist(
  "secp521r1", // name
  521,
  "1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", // p
  "1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC", // a
  "051953EB9618E1C9A1F929A21A0B68540EEA2DA725B99B315F3B8B489918EF109E156193951EC7E937B1652C0BD3BB1BF073573DF883D2C34F1EF451FD46B503F00", // b
  "1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFA51868783BF2F966B7FCC0148F709A5D03BB5C9B8899C47AEBB6FB71E91386409", // n
  "1", // h
  "C6858E06B70404E9CD9E3ECB662395B4429C648139053FB521F828AF606B4D3DBAA14B5E77EFE75928FE1DC127A2FFA8DE3348B3C1856A429BF97E7E31C2E5BD66", // gx
  "011839296a789a3bc0045c8a5fb42c7d1bd998f54449579b446817afbd17273e662c97ee72995ef42640c550b9013fad0761353c7086a272c24088be94769fd16650", // gy
  ["NIST P-521", "P-521"]); // alias

/* dsa-2.1.1.js (c) 2016-2017 Kenji Urushimma | kjur.github.com/jsrsasign/license
 */
/*
 * dsa.js - new DSA class
 *
 * Copyright (c) 2016-2017 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name dsa-2.0.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version jsrsasign 7.2.0 dsa 2.1.1 (2017-May-11)
 * @since jsrsasign 7.0.0
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

if (typeof KJUR == "undefined" || !KJUR) KJUR = {};
if (typeof KJUR.crypto == "undefined" || !KJUR.crypto) KJUR.crypto = {};

/**
 * class for DSA signing and verification
 * @name KJUR.crypto.DSA
 * @class class for DSA signing and verifcation
 * @since jsrsasign 7.0.0 dsa 2.0.0
 * @description
 * <p>
 * CAUTION: Most of the case, you don't need to use this class.
 * Please use {@link KJUR.crypto.Signature} class instead.
 * </p>
 * <p>
 * NOTE: Until jsrsasign 6.2.3, DSA class have used codes from openpgpjs library 1.0.0
 * licenced under LGPL licence. To avoid license issue dsa-2.0.js was re-written with
 * my own codes in jsrsasign 7.0.0. 
 * Some random number generators used in dsa-2.0.js was newly defined
 * in KJUR.crypto.Util class. Now all of LGPL codes are removed.
 * </p>
 */
KJUR.crypto.DSA = function() {
    this.p = null;
    this.q = null;
    this.g = null;
    this.y = null;
    this.x = null;
    this.type = "DSA";
    this.isPrivate = false;
    this.isPublic = false;

    //===========================
    // PUBLIC METHODS
    //===========================

    /**
     * set DSA private key by key parameters of BigInteger object
     * @name setPrivate
     * @memberOf KJUR.crypto.DSA#
     * @function
     * @param {BigInteger} p prime P parameter
     * @param {BigInteger} q sub prime Q parameter
     * @param {BigInteger} g base G parameter
     * @param {BigInteger} y public key Y or null
     * @param {BigInteger} x private key X
     * @since jsrsasign 7.0.0 dsa 2.0.0
     */
    this.setPrivate = function(p, q, g, y, x) {
	this.isPrivate = true;
	this.p = p;
	this.q = q;
	this.g = g;
	this.y = y;
	this.x = x;
    };

    /**
     * set DSA private key by key parameters of hexadecimal string
     * @name setPrivateHex
     * @memberOf KJUR.crypto.DSA#
     * @function
     * @param {String} hP prime P parameter
     * @param {String} hQ sub prime Q parameter
     * @param {String} hG base G parameter
     * @param {String} hY public key Y or null
     * @param {String} hX private key X
     * @since jsrsasign 7.1.0 dsa 2.1.0
     */
    this.setPrivateHex = function(hP, hQ, hG, hY, hX) {
	var biP, biQ, biG, biY, biX;
        biP = new BigInteger(hP, 16);
        biQ = new BigInteger(hQ, 16);
        biG = new BigInteger(hG, 16);
	if (typeof hY === "string" && hY.length > 1) {
            biY = new BigInteger(hY, 16);
	} else {
	    biY = null;
	}
        biX = new BigInteger(hX, 16);
        this.setPrivate(biP, biQ, biG, biY, biX);
    };

    /**
     * set DSA public key by key parameters of BigInteger object
     * @name setPublic
     * @memberOf KJUR.crypto.DSA#
     * @function
     * @param {BigInteger} p prime P parameter
     * @param {BigInteger} q sub prime Q parameter
     * @param {BigInteger} g base G parameter
     * @param {BigInteger} y public key Y
     * @since jsrsasign 7.0.0 dsa 2.0.0
     */
    this.setPublic = function(p, q, g, y) {
	this.isPublic = true;
	this.p = p;
	this.q = q;
	this.g = g;
	this.y = y;
	this.x = null;
    };

    /**
     * set DSA public key by key parameters of hexadecimal string
     * @name setPublicHex
     * @memberOf KJUR.crypto.DSA#
     * @function
     * @param {String} hP prime P parameter
     * @param {String} hQ sub prime Q parameter
     * @param {String} hG base G parameter
     * @param {String} hY public key Y
     * @since jsrsasign 7.1.0 dsa 2.1.0
     */
    this.setPublicHex = function(hP, hQ, hG, hY) {
	var biP, biQ, biG, biY;
        biP = new BigInteger(hP, 16);
        biQ = new BigInteger(hQ, 16);
        biG = new BigInteger(hG, 16);
        biY = new BigInteger(hY, 16);
        this.setPublic(biP, biQ, biG, biY);
    };

    /**
     * sign to hashed message by this DSA private key object
     * @name signWithMessageHash
     * @memberOf KJUR.crypto.DSA#
     * @function
     * @param {String} sHashHex hexadecimal string of hashed message
     * @return {String} hexadecimal string of ASN.1 encoded DSA signature value
     * @since jsrsasign 7.0.0 dsa 2.0.0
     */
    this.signWithMessageHash = function(sHashHex) {
	var p = this.p; // parameter p
	var q = this.q; // parameter q
	var g = this.g; // parameter g
	var y = this.y; // public key (p q g y)
	var x = this.x; // private key

	// NIST FIPS 186-4 4.5 DSA Per-Message Secret Number (p18)
	// 1. get random k where 0 < k < q
	var k = KJUR.crypto.Util.getRandomBigIntegerMinToMax(BigInteger.ONE.add(BigInteger.ONE),
							     q.subtract(BigInteger.ONE));

	// NIST FIPS 186-4 4.6 DSA Signature Generation (p19)
	// 2. get z where the left most min(N, outlen) bits of Hash(M)
	var hZ = sHashHex.substr(0, q.bitLength() / 4);
	var z = new BigInteger(hZ, 16);

	// 3. get r where (g^k mod p) mod q, r != 0
	var r = (g.modPow(k,p)).mod(q); 

	// 4. get s where k^-1 (z + xr) mod q, s != 0
	var s = (k.modInverse(q).multiply(z.add(x.multiply(r)))).mod(q);

	// 5. signature (r, s)
	var result = KJUR.asn1.ASN1Util.jsonToASN1HEX({
	    "seq": [{"int": {"bigint": r}}, {"int": {"bigint": s}}] 
	});
	return result;
    };

    /**
     * verify signature by this DSA public key object
     * @name verifyWithMessageHash
     * @memberOf KJUR.crypto.DSA#
     * @function
     * @param {String} sHashHex hexadecimal string of hashed message
     * @param {String} hSigVal hexadecimal string of ASN.1 encoded DSA signature value
     * @return {Boolean} true if the signature is valid otherwise false.
     * @since jsrsasign 7.0.0 dsa 2.0.0
     */
    this.verifyWithMessageHash = function(sHashHex, hSigVal) {
	var p = this.p; // parameter p
	var q = this.q; // parameter q
	var g = this.g; // parameter g
	var y = this.y; // public key (p q g y)

	// 1. parse ASN.1 signature (r, s)
	var rs = this.parseASN1Signature(hSigVal);
        var r = rs[0];
        var s = rs[1];

	// NIST FIPS 186-4 4.6 DSA Signature Generation (p19)
	// 2. get z where the left most min(N, outlen) bits of Hash(M)
	var hZ = sHashHex.substr(0, q.bitLength() / 4);
	var z = new BigInteger(hZ, 16);

	// NIST FIPS 186-4 4.7 DSA Signature Validation (p19)
	// 3.1. 0 < r < q
	if (BigInteger.ZERO.compareTo(r) > 0 || r.compareTo(q) > 0)
	    throw "invalid DSA signature";

	// 3.2. 0 < s < q
	if (BigInteger.ZERO.compareTo(s) >= 0 || s.compareTo(q) > 0)
	    throw "invalid DSA signature";

	// 4. get w where w = s^-1 mod q
	var w = s.modInverse(q);

	// 5. get u1 where u1 = z w mod q
	var u1 = z.multiply(w).mod(q);

	// 6. get u2 where u2 = r w mod q
	var u2 = r.multiply(w).mod(q);

	// 7. get v where v = ((g^u1 y^u2) mod p) mod q
	var v = g.modPow(u1,p).multiply(y.modPow(u2,p)).mod(p).mod(q);

	// 8. signature is valid when v == r
	return v.compareTo(r) == 0;
    };

    /**
     * parse hexadecimal ASN.1 DSA signature value
     * @name parseASN1Signature
     * @memberOf KJUR.crypto.DSA#
     * @function
     * @param {String} hSigVal hexadecimal string of ASN.1 encoded DSA signature value
     * @return {Array} array [r, s] of DSA signature value. Both r and s are BigInteger.
     * @since jsrsasign 7.0.0 dsa 2.0.0
     */
    this.parseASN1Signature = function(hSigVal) {
	try {
	    var r = new BigInteger(ASN1HEX.getVbyList(hSigVal, 0, [0], "02"), 16);
	    var s = new BigInteger(ASN1HEX.getVbyList(hSigVal, 0, [1], "02"), 16);
	    return [r, s];
	} catch (ex) {
	    throw "malformed ASN.1 DSA signature";
	}
    }

    /**
     * read an ASN.1 hexadecimal string of PKCS#1/5 plain DSA private key<br/>
     * @name readPKCS5PrvKeyHex
     * @memberOf KJUR.crypto.DSA#
     * @function
     * @param {String} h hexadecimal string of PKCS#1/5 DSA private key
     * @since jsrsasign 7.1.0 dsa 2.1.0
     */
    this.readPKCS5PrvKeyHex = function(h) {
	var hP, hQ, hG, hY, hX;
	var _ASN1HEX = ASN1HEX;
	var _getVbyList = _ASN1HEX.getVbyList;

	if (_ASN1HEX.isASN1HEX(h) === false)
	    throw "not ASN.1 hex string";

	try {
	    hP = _getVbyList(h, 0, [1], "02");
	    hQ = _getVbyList(h, 0, [2], "02");
	    hG = _getVbyList(h, 0, [3], "02");
	    hY = _getVbyList(h, 0, [4], "02");
	    hX = _getVbyList(h, 0, [5], "02");
	} catch(ex) {
	    console.log("EXCEPTION:" + ex);
	    throw "malformed PKCS#1/5 plain DSA private key";
	}

	this.setPrivateHex(hP, hQ, hG, hY, hX);
    };

    /**
     * read an ASN.1 hexadecimal string of PKCS#8 plain DSA private key<br/>
     * @name readPKCS8PrvKeyHex
     * @memberOf KJUR.crypto.DSA#
     * @function
     * @param {String} h hexadecimal string of PKCS#8 DSA private key
     * @since jsrsasign 7.1.0 dsa 2.1.0
     */
    this.readPKCS8PrvKeyHex = function(h) {
	var hP, hQ, hG, hX;
	var _ASN1HEX = ASN1HEX;
	var _getVbyList = _ASN1HEX.getVbyList;

	if (_ASN1HEX.isASN1HEX(h) === false)
	    throw "not ASN.1 hex string";

	try {
	    hP = _getVbyList(h, 0, [1, 1, 0], "02");
	    hQ = _getVbyList(h, 0, [1, 1, 1], "02");
	    hG = _getVbyList(h, 0, [1, 1, 2], "02");
	    hX = _getVbyList(h, 0, [2, 0], "02");
	} catch(ex) {
	    console.log("EXCEPTION:" + ex);
	    throw "malformed PKCS#8 plain DSA private key";
	}

	this.setPrivateHex(hP, hQ, hG, null, hX);
    };

    /**
     * read an ASN.1 hexadecimal string of PKCS#8 plain DSA private key<br/>
     * @name readPKCS8PubKeyHex
     * @memberOf KJUR.crypto.DSA#
     * @function
     * @param {String} h hexadecimal string of PKCS#8 DSA private key
     * @since jsrsasign 7.1.0 dsa 2.1.0
     */
    this.readPKCS8PubKeyHex = function(h) {
	var hP, hQ, hG, hY;
	var _ASN1HEX = ASN1HEX;
	var _getVbyList = _ASN1HEX.getVbyList;

	if (_ASN1HEX.isASN1HEX(h) === false)
	    throw "not ASN.1 hex string";

	try {
	    hP = _getVbyList(h, 0, [0, 1, 0], "02");
	    hQ = _getVbyList(h, 0, [0, 1, 1], "02");
	    hG = _getVbyList(h, 0, [0, 1, 2], "02");
	    hY = _getVbyList(h, 0, [1, 0], "02");
	} catch(ex) {
	    console.log("EXCEPTION:" + ex);
	    throw "malformed PKCS#8 DSA public key";
	}

	this.setPublicHex(hP, hQ, hG, hY);
    };

    /**
     * read an ASN.1 hexadecimal string of X.509 DSA public key certificate<br/>
     * @name readCertPubKeyHex
     * @memberOf KJUR.crypto.DSA#
     * @function
     * @param {String} h hexadecimal string of X.509 DSA public key certificate
     * @param {Integer} nthPKI nth index of publicKeyInfo. (DEFAULT: 6 for X509v3)
     * @since jsrsasign 7.1.0 dsa 2.1.0
     */
    this.readCertPubKeyHex = function(h, nthPKI) {
	if (nthPKI !== 5) nthPKI = 6;
	var hP, hQ, hG, hY;
	var _ASN1HEX = ASN1HEX;
	var _getVbyList = _ASN1HEX.getVbyList;

	if (_ASN1HEX.isASN1HEX(h) === false)
	    throw "not ASN.1 hex string";

	try {
	    hP = _getVbyList(h, 0, [0, nthPKI, 0, 1, 0], "02");
	    hQ = _getVbyList(h, 0, [0, nthPKI, 0, 1, 1], "02");
	    hG = _getVbyList(h, 0, [0, nthPKI, 0, 1, 2], "02");
	    hY = _getVbyList(h, 0, [0, nthPKI, 1, 0], "02");
	} catch(ex) {
	    console.log("EXCEPTION:" + ex);
	    throw "malformed X.509 certificate DSA public key";
	}

	this.setPublicHex(hP, hQ, hG, hY);
    };
}
/* keyutil-1.2.0.js (c) 2013-2017 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * keyutil.js - key utility for PKCS#1/5/8 PEM, RSA/DSA/ECDSA key object
 *
 * Copyright (c) 2013-2017 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */
/**
 * @fileOverview
 * @name keyutil-1.0.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version jsrsasign 8.0.0 keyutil 1.2.0 (2017-Jun-26)
 * @since jsrsasign 4.1.4
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

/**
 * @name KEYUTIL
 * @class class for RSA/ECC/DSA key utility
 * @description 
 * <br/>
 * {@link KEYUTIL} class is an update of former {@link PKCS5PKEY} class.
 * {@link KEYUTIL} class has following features:
 * <dl>
 * <dt><b>key loading - {@link KEYUTIL.getKey}</b>
 * <dd>
 * <ul>
 * <li>supports RSAKey and KJUR.crypto.{ECDSA,DSA} key object</li>
 * <li>supports private key and public key</li>
 * <li>supports encrypted and plain private key</li>
 * <li>supports PKCS#1, PKCS#5 and PKCS#8 key</li>
 * <li>supports public key in X.509 certificate</li>
 * <li>key represented by JSON object</li>
 * </ul>
 * NOTE1: Encrypted PKCS#8 only supports PBKDF2/HmacSHA1/3DES <br/>
 * NOTE2: Encrypted PKCS#5 supports DES-CBC, DES-EDE3-CBC, AES-{128,192.256}-CBC <br/>
 *
 * <dt><b>exporting key - {@link KEYUTIL.getPEM}</b>
 * <dd>
 * {@link KEYUTIL.getPEM} method supports following formats:
 * <ul>
 * <li>supports RSA/EC/DSA keys</li>
 * <li>PKCS#1 plain RSA/EC/DSA private key</li>
 * <li>PKCS#5 encrypted RSA/EC/DSA private key with DES-CBC, DES-EDE3-CBC, AES-{128,192.256}-CBC</li>
 * <li>PKCS#8 plain RSA/EC/DSA private key</li>
 * <li>PKCS#8 encrypted RSA/EC/DSA private key with PBKDF2_HmacSHA1_3DES</li>
 * </ul>
 *
 * <dt><b>keypair generation - {@link KEYUTIL.generateKeypair}</b>
 * <ul>
 * <li>generate key pair of {@link RSAKey} or {@link KJUR.crypto.ECDSA}.</li>
 * <li>generate private key and convert it to PKCS#5 encrypted private key.</li>
 * </ul>
 * NOTE: {@link KJUR.crypto.DSA} is not yet supported.
 * </dl>
 * 
 * @example
 * // 1. loading PEM private key
 * var key = KEYUTIL.getKey(pemPKCS1PrivateKey);
 * var key = KEYUTIL.getKey(pemPKCS5EncryptedPrivateKey, "passcode");
 * var key = KEYUTIL.getKey(pemPKC85PlainPrivateKey);
 * var key = KEYUTIL.getKey(pemPKC85EncryptedPrivateKey, "passcode");
 * // 2. loading PEM public key
 * var key = KEYUTIL.getKey(pemPKCS8PublicKey);
 * var key = KEYUTIL.getKey(pemX509Certificate);
 * // 3. exporting private key
 * var pem = KEYUTIL.getPEM(privateKeyObj, "PKCS1PRV");
 * var pem = KEYUTIL.getPEM(privateKeyObj, "PKCS5PRV", "passcode"); // DES-EDE3-CBC by default
 * var pem = KEYUTIL.getPEM(privateKeyObj, "PKCS5PRV", "passcode", "DES-CBC");
 * var pem = KEYUTIL.getPEM(privateKeyObj, "PKCS8PRV");
 * var pem = KEYUTIL.getPEM(privateKeyObj, "PKCS8PRV", "passcode");
 * // 4. exporting public key
 * var pem = KEYUTIL.getPEM(publicKeyObj);
 */
var KEYUTIL = function() {
    // *****************************************************************
    // *** PRIVATE PROPERTIES AND METHODS *******************************
    // *****************************************************************
    // shared key decryption ------------------------------------------
    var decryptAES = function(dataHex, keyHex, ivHex) {
        return decryptGeneral(CryptoJS.AES, dataHex, keyHex, ivHex);
    };

    var decrypt3DES = function(dataHex, keyHex, ivHex) {
        return decryptGeneral(CryptoJS.TripleDES, dataHex, keyHex, ivHex);
    };

    var decryptDES = function(dataHex, keyHex, ivHex) {
        return decryptGeneral(CryptoJS.DES, dataHex, keyHex, ivHex);
    };

    var decryptGeneral = function(f, dataHex, keyHex, ivHex) {
        var data = CryptoJS.enc.Hex.parse(dataHex);
        var key = CryptoJS.enc.Hex.parse(keyHex);
        var iv = CryptoJS.enc.Hex.parse(ivHex);
        var encrypted = {};
        encrypted.key = key;
        encrypted.iv = iv;
        encrypted.ciphertext = data;
        var decrypted = f.decrypt(encrypted, key, { iv: iv });
        return CryptoJS.enc.Hex.stringify(decrypted);
    };

    // shared key decryption ------------------------------------------
    var encryptAES = function(dataHex, keyHex, ivHex) {
        return encryptGeneral(CryptoJS.AES, dataHex, keyHex, ivHex);
    };

    var encrypt3DES = function(dataHex, keyHex, ivHex) {
        return encryptGeneral(CryptoJS.TripleDES, dataHex, keyHex, ivHex);
    };

    var encryptDES = function(dataHex, keyHex, ivHex) {
        return encryptGeneral(CryptoJS.DES, dataHex, keyHex, ivHex);
    };

    var encryptGeneral = function(f, dataHex, keyHex, ivHex) {
        var data = CryptoJS.enc.Hex.parse(dataHex);
        var key = CryptoJS.enc.Hex.parse(keyHex);
        var iv = CryptoJS.enc.Hex.parse(ivHex);
        var encryptedHex = f.encrypt(data, key, { iv: iv });
        var encryptedWA = CryptoJS.enc.Hex.parse(encryptedHex.toString());
        var encryptedB64 = CryptoJS.enc.Base64.stringify(encryptedWA);
        return encryptedB64;
    };

    // other methods and properties ----------------------------------------
    var ALGLIST = {
        'AES-256-CBC':  { 'proc': decryptAES,  'eproc': encryptAES,  keylen: 32, ivlen: 16 },
        'AES-192-CBC':  { 'proc': decryptAES,  'eproc': encryptAES,  keylen: 24, ivlen: 16 },
        'AES-128-CBC':  { 'proc': decryptAES,  'eproc': encryptAES,  keylen: 16, ivlen: 16 },
        'DES-EDE3-CBC': { 'proc': decrypt3DES, 'eproc': encrypt3DES, keylen: 24, ivlen: 8 },
        'DES-CBC':      { 'proc': decryptDES,  'eproc': encryptDES,  keylen: 8,  ivlen: 8 }
    };

    var getFuncByName = function(algName) {
        return ALGLIST[algName]['proc'];
    };

    var _generateIvSaltHex = function(numBytes) {
        var wa = CryptoJS.lib.WordArray.random(numBytes);
        var hex = CryptoJS.enc.Hex.stringify(wa);
        return hex;
    };

    var _parsePKCS5PEM = function(sPKCS5PEM) {
        var info = {};
        var matchResult1 = sPKCS5PEM.match(new RegExp("DEK-Info: ([^,]+),([0-9A-Fa-f]+)", "m"));
        if (matchResult1) {
            info.cipher = matchResult1[1];
            info.ivsalt = matchResult1[2];
        }
        var matchResult2 = sPKCS5PEM.match(new RegExp("-----BEGIN ([A-Z]+) PRIVATE KEY-----"));
        if (matchResult2) {
            info.type = matchResult2[1];
        }
        var i1 = -1;
        var lenNEWLINE = 0;
        if (sPKCS5PEM.indexOf("\r\n\r\n") != -1) {
            i1 = sPKCS5PEM.indexOf("\r\n\r\n");
            lenNEWLINE = 2;
        }
        if (sPKCS5PEM.indexOf("\n\n") != -1) {
            i1 = sPKCS5PEM.indexOf("\n\n");
            lenNEWLINE = 1;
        }
        var i2 = sPKCS5PEM.indexOf("-----END");
        if (i1 != -1 && i2 != -1) {
            var s = sPKCS5PEM.substring(i1 + lenNEWLINE * 2, i2 - lenNEWLINE);
            s = s.replace(/\s+/g, '');
            info.data = s;
        }
        return info;
    };

    var _getKeyAndUnusedIvByPasscodeAndIvsalt = function(algName, passcode, ivsaltHex) {
        //alert("ivsaltHex(2) = " + ivsaltHex);
        var saltHex = ivsaltHex.substring(0, 16);
        //alert("salt = " + saltHex);
        
        var salt = CryptoJS.enc.Hex.parse(saltHex);
        var data = CryptoJS.enc.Utf8.parse(passcode);
        //alert("salt = " + salt);
        //alert("data = " + data);

        var nRequiredBytes = ALGLIST[algName]['keylen'] + ALGLIST[algName]['ivlen'];
        var hHexValueJoined = '';
        var hLastValue = null;
        //alert("nRequiredBytes = " + nRequiredBytes);
        for (;;) {
            var h = CryptoJS.algo.MD5.create();
            if (hLastValue != null) {
                h.update(hLastValue);
            }
            h.update(data);
            h.update(salt);
            hLastValue = h.finalize();
            hHexValueJoined = hHexValueJoined + CryptoJS.enc.Hex.stringify(hLastValue);
            //alert("joined = " + hHexValueJoined);
            if (hHexValueJoined.length >= nRequiredBytes * 2) {
                break;
            }
        }
        var result = {};
        result.keyhex = hHexValueJoined.substr(0, ALGLIST[algName]['keylen'] * 2);
        result.ivhex = hHexValueJoined.substr(ALGLIST[algName]['keylen'] * 2, ALGLIST[algName]['ivlen'] * 2);
        return result;
    };

    /*
     * @param {String} privateKeyB64 base64 string of encrypted private key
     * @param {String} sharedKeyAlgName algorithm name of shared key encryption
     * @param {String} sharedKeyHex hexadecimal string of shared key to encrypt
     * @param {String} ivsaltHex hexadecimal string of IV and salt
     * @param {String} hexadecimal string of decrypted private key
     */
    var _decryptKeyB64 = function(privateKeyB64, sharedKeyAlgName, sharedKeyHex, ivsaltHex) {
        var privateKeyWA = CryptoJS.enc.Base64.parse(privateKeyB64);
        var privateKeyHex = CryptoJS.enc.Hex.stringify(privateKeyWA);
        var f = ALGLIST[sharedKeyAlgName]['proc'];
        var decryptedKeyHex = f(privateKeyHex, sharedKeyHex, ivsaltHex);
        return decryptedKeyHex;
    };
    
    /*
     * @param {String} privateKeyHex hexadecimal string of private key
     * @param {String} sharedKeyAlgName algorithm name of shared key encryption
     * @param {String} sharedKeyHex hexadecimal string of shared key to encrypt
     * @param {String} ivsaltHex hexadecimal string of IV and salt
     * @param {String} base64 string of encrypted private key
     */
    var _encryptKeyHex = function(privateKeyHex, sharedKeyAlgName, sharedKeyHex, ivsaltHex) {
        var f = ALGLIST[sharedKeyAlgName]['eproc'];
        var encryptedKeyB64 = f(privateKeyHex, sharedKeyHex, ivsaltHex);
        return encryptedKeyB64;
    };

    // *****************************************************************
    // *** PUBLIC PROPERTIES AND METHODS *******************************
    // *****************************************************************
    return {
        // -- UTILITY METHODS ------------------------------------------------------------
        /**
         * decrypt private key by shared key
         * @name version
         * @memberOf KEYUTIL
         * @property {String} version
         * @description version string of KEYUTIL class
         */
        version: "1.0.0",

        /**
         * parse PEM formatted passcode protected PKCS#5 private key
         * @name parsePKCS5PEM
         * @memberOf KEYUTIL
         * @function
         * @param {String} sEncryptedPEM PEM formatted protected passcode protected PKCS#5 private key
         * @return {Hash} hash of key information
         * @description
         * Resulted hash has following attributes.
         * <ul>
         * <li>cipher - symmetric key algorithm name (ex. 'DES-EBE3-CBC', 'AES-256-CBC')</li>
         * <li>ivsalt - IV used for decrypt. Its heading 8 bytes will be used for passcode salt.</li>
         * <li>type - asymmetric key algorithm name of private key described in PEM header.</li>
         * <li>data - base64 encoded encrypted private key.</li>
         * </ul>
         *
         */
        parsePKCS5PEM: function(sPKCS5PEM) {
            return _parsePKCS5PEM(sPKCS5PEM);
        },

        /**
         * the same function as OpenSSL EVP_BytsToKey to generate shared key and IV
         * @name getKeyAndUnusedIvByPasscodeAndIvsalt
         * @memberOf KEYUTIL
         * @function
         * @param {String} algName name of symmetric key algorithm (ex. 'DES-EBE3-CBC')
         * @param {String} passcode passcode to decrypt private key (ex. 'password')
         * @param {String} hexadecimal string of IV. heading 8 bytes will be used for passcode salt
         * @return {Hash} hash of key and unused IV (ex. {keyhex:2fe3..., ivhex:3fad..})
         */
        getKeyAndUnusedIvByPasscodeAndIvsalt: function(algName, passcode, ivsaltHex) {
            return _getKeyAndUnusedIvByPasscodeAndIvsalt(algName, passcode, ivsaltHex);
        },

        decryptKeyB64: function(privateKeyB64, sharedKeyAlgName, sharedKeyHex, ivsaltHex) {
            return _decryptKeyB64(privateKeyB64, sharedKeyAlgName, sharedKeyHex, ivsaltHex);
        },

        /**
         * decrypt PEM formatted protected PKCS#5 private key with passcode
         * @name getDecryptedKeyHex
         * @memberOf KEYUTIL
         * @function
         * @param {String} sEncryptedPEM PEM formatted protected passcode protected PKCS#5 private key
         * @param {String} passcode passcode to decrypt private key (ex. 'password')
         * @return {String} hexadecimal string of decrypted RSA priavte key
         */
        getDecryptedKeyHex: function(sEncryptedPEM, passcode) {
            // 1. parse pem
            var info = _parsePKCS5PEM(sEncryptedPEM);
            var publicKeyAlgName = info.type;
            var sharedKeyAlgName = info.cipher;
            var ivsaltHex = info.ivsalt;
            var privateKeyB64 = info.data;
            //alert("ivsaltHex = " + ivsaltHex);

            // 2. generate shared key
            var sharedKeyInfo = _getKeyAndUnusedIvByPasscodeAndIvsalt(sharedKeyAlgName, passcode, ivsaltHex);
            var sharedKeyHex = sharedKeyInfo.keyhex;
            //alert("sharedKeyHex = " + sharedKeyHex);

            // 3. decrypt private key
            var decryptedKey = _decryptKeyB64(privateKeyB64, sharedKeyAlgName, sharedKeyHex, ivsaltHex);
            return decryptedKey;
        },

        /*
         * get PEM formatted encrypted PKCS#5 private key from hexadecimal string of plain private key
         * @name getEncryptedPKCS5PEMFromPrvKeyHex
         * @memberOf KEYUTIL
         * @function
         * @param {String} pemHeadAlg algorithm name in the pem header (i.e. RSA,EC or DSA)
         * @param {String} hPrvKey hexadecimal string of plain private key
         * @param {String} passcode pass code to protect private key (ex. password)
         * @param {String} sharedKeyAlgName algorithm name to protect private key (ex. AES-256-CBC)
         * @param {String} ivsaltHex hexadecimal string of IV and salt
         * @return {String} string of PEM formatted encrypted PKCS#5 private key
         * @since pkcs5pkey 1.0.2
         * @description
         * <br/>
         * generate PEM formatted encrypted PKCS#5 private key by hexadecimal string encoded
         * ASN.1 object of plain RSA private key.
         * Following arguments can be omitted.
         * <ul>
         * <li>alg - AES-256-CBC will be used if omitted.</li>
         * <li>ivsaltHex - automatically generate IV and salt which length depends on algorithm</li>
         * </ul>
         * NOTE1: DES-CBC, DES-EDE3-CBC, AES-{128,192.256}-CBC algorithm are supported.
         * @example
         * var pem = 
         *   KEYUTIL.getEncryptedPKCS5PEMFromPrvKeyHex(plainKeyHex, "password");
         * var pem2 = 
         *   KEYUTIL.getEncryptedPKCS5PEMFromPrvKeyHex(plainKeyHex, "password", "AES-128-CBC");
         * var pem3 = 
         *   KEYUTIL.getEncryptedPKCS5PEMFromPrvKeyHex(plainKeyHex, "password", "AES-128-CBC", "1f3d02...");
         */
        getEncryptedPKCS5PEMFromPrvKeyHex: function(pemHeadAlg, hPrvKey, passcode, sharedKeyAlgName, ivsaltHex) {
            var sPEM = "";

            // 1. set sharedKeyAlgName if undefined (default AES-256-CBC)
            if (typeof sharedKeyAlgName == "undefined" || sharedKeyAlgName == null) {
                sharedKeyAlgName = "AES-256-CBC";
            }
            if (typeof ALGLIST[sharedKeyAlgName] == "undefined")
                throw "KEYUTIL unsupported algorithm: " + sharedKeyAlgName;

            // 2. set ivsaltHex if undefined
            if (typeof ivsaltHex == "undefined" || ivsaltHex == null) {
                var ivlen = ALGLIST[sharedKeyAlgName]['ivlen'];
                var randIV = _generateIvSaltHex(ivlen);
                ivsaltHex = randIV.toUpperCase();
            }

            // 3. get shared key
            //alert("ivsalthex=" + ivsaltHex);
            var sharedKeyInfo = _getKeyAndUnusedIvByPasscodeAndIvsalt(sharedKeyAlgName, passcode, ivsaltHex);
            var sharedKeyHex = sharedKeyInfo.keyhex;
            // alert("sharedKeyHex = " + sharedKeyHex);

            // 3. get encrypted Key in Base64
            var encryptedKeyB64 = _encryptKeyHex(hPrvKey, sharedKeyAlgName, sharedKeyHex, ivsaltHex);

            var pemBody = encryptedKeyB64.replace(/(.{64})/g, "$1\r\n");
            var sPEM = "-----BEGIN " + pemHeadAlg + " PRIVATE KEY-----\r\n";
            sPEM += "Proc-Type: 4,ENCRYPTED\r\n";
            sPEM += "DEK-Info: " + sharedKeyAlgName + "," + ivsaltHex + "\r\n";
            sPEM += "\r\n";
            sPEM += pemBody;
            sPEM += "\r\n-----END " + pemHeadAlg + " PRIVATE KEY-----\r\n";

            return sPEM;
        },

        // === PKCS8 ===============================================================

        /**
         * generate PBKDF2 key hexstring with specified passcode and information
         * @name parseHexOfEncryptedPKCS8
         * @memberOf KEYUTIL
         * @function
         * @param {String} passcode passcode to decrypto private key
         * @return {Array} info associative array of PKCS#8 parameters
         * @since pkcs5pkey 1.0.3
         * @description
         * The associative array which is returned by this method has following properties:
         * <ul>
         * <li>info.pbkdf2Salt - hexadecimal string of PBKDF2 salt</li>
         * <li>info.pkbdf2Iter - iteration count</li>
         * <li>info.ciphertext - hexadecimal string of encrypted private key</li>
         * <li>info.encryptionSchemeAlg - encryption algorithm name (currently TripleDES only)</li>
         * <li>info.encryptionSchemeIV - initial vector for encryption algorithm</li>
         * </ul>
         * Currently, this method only supports PKCS#5v2.0 with PBES2/PBDKF2 of HmacSHA1 and TripleDES.
         * <ul>
         * <li>keyDerivationFunc = pkcs5PBKDF2 with HmacSHA1</li>
         * <li>encryptionScheme = des-EDE3-CBC(i.e. TripleDES</li>
         * </ul>
         * @example
         * // to convert plain PKCS#5 private key to encrypted PKCS#8 private
         * // key with PBKDF2 with TripleDES
         * % openssl pkcs8 -in plain_p5.pem -topk8 -v2 -des3 -out encrypted_p8.pem
         */
        parseHexOfEncryptedPKCS8: function(sHEX) {
	    var _ASN1HEX = ASN1HEX;
	    var _getChildIdx = _ASN1HEX.getChildIdx;
	    var _getV = _ASN1HEX.getV;
            var info = {};
            
            var a0 = _getChildIdx(sHEX, 0);
            if (a0.length != 2)
                throw "malformed format: SEQUENCE(0).items != 2: " + a0.length;

            // 1. ciphertext
            info.ciphertext = _getV(sHEX, a0[1]);

            // 2. pkcs5PBES2
            var a0_0 = _getChildIdx(sHEX, a0[0]); 
            if (a0_0.length != 2)
                throw "malformed format: SEQUENCE(0.0).items != 2: " + a0_0.length;

            // 2.1 check if pkcs5PBES2(1 2 840 113549 1 5 13)
            if (_getV(sHEX, a0_0[0]) != "2a864886f70d01050d")
                throw "this only supports pkcs5PBES2";

            // 2.2 pkcs5PBES2 param
            var a0_0_1 = _getChildIdx(sHEX, a0_0[1]); 
            if (a0_0.length != 2)
                throw "malformed format: SEQUENCE(0.0.1).items != 2: " + a0_0_1.length;

            // 2.2.1 encryptionScheme
            var a0_0_1_1 = _getChildIdx(sHEX, a0_0_1[1]); 
            if (a0_0_1_1.length != 2)
                throw "malformed format: SEQUENCE(0.0.1.1).items != 2: " + a0_0_1_1.length;
            if (_getV(sHEX, a0_0_1_1[0]) != "2a864886f70d0307")
                throw "this only supports TripleDES";
            info.encryptionSchemeAlg = "TripleDES";

            // 2.2.1.1 IV of encryptionScheme
            info.encryptionSchemeIV = _getV(sHEX, a0_0_1_1[1]);

            // 2.2.2 keyDerivationFunc
            var a0_0_1_0 = _getChildIdx(sHEX, a0_0_1[0]); 
            if (a0_0_1_0.length != 2)
                throw "malformed format: SEQUENCE(0.0.1.0).items != 2: " + a0_0_1_0.length;
            if (_getV(sHEX, a0_0_1_0[0]) != "2a864886f70d01050c")
                throw "this only supports pkcs5PBKDF2";

            // 2.2.2.1 pkcs5PBKDF2 param
            var a0_0_1_0_1 = _getChildIdx(sHEX, a0_0_1_0[1]); 
            if (a0_0_1_0_1.length < 2)
                throw "malformed format: SEQUENCE(0.0.1.0.1).items < 2: " + a0_0_1_0_1.length;

            // 2.2.2.1.1 PBKDF2 salt
            info.pbkdf2Salt = _getV(sHEX, a0_0_1_0_1[0]);

            // 2.2.2.1.2 PBKDF2 iter
            var iterNumHex = _getV(sHEX, a0_0_1_0_1[1]);
            try {
                info.pbkdf2Iter = parseInt(iterNumHex, 16);
            } catch(ex) {
                throw "malformed format pbkdf2Iter: " + iterNumHex;
            }

            return info;
        },

        /**
         * generate PBKDF2 key hexstring with specified passcode and information
         * @name getPBKDF2KeyHexFromParam
         * @memberOf KEYUTIL
         * @function
         * @param {Array} info result of {@link parseHexOfEncryptedPKCS8} which has preference of PKCS#8 file
         * @param {String} passcode passcode to decrypto private key
         * @return {String} hexadecimal string of PBKDF2 key
         * @since pkcs5pkey 1.0.3
         * @description
         * As for info, this uses following properties:
         * <ul>
         * <li>info.pbkdf2Salt - hexadecimal string of PBKDF2 salt</li>
         * <li>info.pkbdf2Iter - iteration count</li>
         * </ul>
         * Currently, this method only supports PKCS#5v2.0 with PBES2/PBDKF2 of HmacSHA1 and TripleDES.
         * <ul>
         * <li>keyDerivationFunc = pkcs5PBKDF2 with HmacSHA1</li>
         * <li>encryptionScheme = des-EDE3-CBC(i.e. TripleDES</li>
         * </ul>
         * @example
         * // to convert plain PKCS#5 private key to encrypted PKCS#8 private
         * // key with PBKDF2 with TripleDES
         * % openssl pkcs8 -in plain_p5.pem -topk8 -v2 -des3 -out encrypted_p8.pem
         */
        getPBKDF2KeyHexFromParam: function(info, passcode) {
            var pbkdf2SaltWS = CryptoJS.enc.Hex.parse(info.pbkdf2Salt);
            var pbkdf2Iter = info.pbkdf2Iter;
            var pbkdf2KeyWS = CryptoJS.PBKDF2(passcode, 
                                              pbkdf2SaltWS, 
                                              { keySize: 192/32, iterations: pbkdf2Iter });
            var pbkdf2KeyHex = CryptoJS.enc.Hex.stringify(pbkdf2KeyWS);
            return pbkdf2KeyHex;
        },

        /*
         * read PEM formatted encrypted PKCS#8 private key and returns hexadecimal string of plain PKCS#8 private key
         * @name getPlainPKCS8HexFromEncryptedPKCS8PEM
         * @memberOf KEYUTIL
         * @function
         * @param {String} pkcs8PEM PEM formatted encrypted PKCS#8 private key
         * @param {String} passcode passcode to decrypto private key
         * @return {String} hexadecimal string of plain PKCS#8 private key
         * @since pkcs5pkey 1.0.3
         * @description
         * Currently, this method only supports PKCS#5v2.0 with PBES2/PBDKF2 of HmacSHA1 and TripleDES.
         * <ul>
         * <li>keyDerivationFunc = pkcs5PBKDF2 with HmacSHA1</li>
         * <li>encryptionScheme = des-EDE3-CBC(i.e. TripleDES</li>
         * </ul>
         * @example
         * // to convert plain PKCS#5 private key to encrypted PKCS#8 private
         * // key with PBKDF2 with TripleDES
         * % openssl pkcs8 -in plain_p5.pem -topk8 -v2 -des3 -out encrypted_p8.pem
         */
        _getPlainPKCS8HexFromEncryptedPKCS8PEM: function(pkcs8PEM, passcode) {
            // 1. derHex - PKCS#8 private key encrypted by PBKDF2
            var derHex = pemtohex(pkcs8PEM, "ENCRYPTED PRIVATE KEY");
            // 2. info - PKCS#5 PBES info
            var info = this.parseHexOfEncryptedPKCS8(derHex);
            // 3. hKey - PBKDF2 key
            var pbkdf2KeyHex = KEYUTIL.getPBKDF2KeyHexFromParam(info, passcode);
            // 4. decrypt ciphertext by PBKDF2 key
            var encrypted = {};
            encrypted.ciphertext = CryptoJS.enc.Hex.parse(info.ciphertext);
            var pbkdf2KeyWS = CryptoJS.enc.Hex.parse(pbkdf2KeyHex);
            var des3IVWS = CryptoJS.enc.Hex.parse(info.encryptionSchemeIV);
            var decWS = CryptoJS.TripleDES.decrypt(encrypted, pbkdf2KeyWS, { iv: des3IVWS });
            var decHex = CryptoJS.enc.Hex.stringify(decWS);
            return decHex;
        },

        /**
         * get RSAKey/ECDSA private key object from encrypted PEM PKCS#8 private key
         * @name getKeyFromEncryptedPKCS8PEM
         * @memberOf KEYUTIL
         * @function
         * @param {String} pkcs8PEM string of PEM formatted PKCS#8 private key
         * @param {String} passcode passcode string to decrypt key
         * @return {Object} RSAKey or KJUR.crypto.ECDSA private key object
         * @since pkcs5pkey 1.0.5
         */
        getKeyFromEncryptedPKCS8PEM: function(pkcs8PEM, passcode) {
            var prvKeyHex = this._getPlainPKCS8HexFromEncryptedPKCS8PEM(pkcs8PEM, passcode);
            var key = this.getKeyFromPlainPrivatePKCS8Hex(prvKeyHex);
            return key;
        },

        /**
         * parse hexadecimal string of plain PKCS#8 private key
         * @name parsePlainPrivatePKCS8Hex
         * @memberOf KEYUTIL
         * @function
         * @param {String} pkcs8PrvHex hexadecimal string of PKCS#8 plain private key
         * @return {Array} associative array of parsed key
         * @since pkcs5pkey 1.0.5
         * @description
         * Resulted associative array has following properties:
         * <ul>
         * <li>algoid - hexadecimal string of OID of asymmetric key algorithm</li>
         * <li>algparam - hexadecimal string of OID of ECC curve name or null</li>
         * <li>keyidx - string starting index of key in pkcs8PrvHex</li>
         * </ul>
         */
        parsePlainPrivatePKCS8Hex: function(pkcs8PrvHex) {
	    var _ASN1HEX = ASN1HEX;
	    var _getChildIdx = _ASN1HEX.getChildIdx;
	    var _getV = _ASN1HEX.getV;
            var result = {};
            result.algparam = null;

            // 1. sequence
            if (pkcs8PrvHex.substr(0, 2) != "30")
                throw "malformed plain PKCS8 private key(code:001)"; // not sequence

            var a1 = _getChildIdx(pkcs8PrvHex, 0);
            if (a1.length != 3)
                throw "malformed plain PKCS8 private key(code:002)";

            // 2. AlgID
            if (pkcs8PrvHex.substr(a1[1], 2) != "30")
                throw "malformed PKCS8 private key(code:003)"; // AlgId not sequence

            var a2 = _getChildIdx(pkcs8PrvHex, a1[1]);
            if (a2.length != 2)
                throw "malformed PKCS8 private key(code:004)"; // AlgId not have two elements

            // 2.1. AlgID OID
            if (pkcs8PrvHex.substr(a2[0], 2) != "06")
                throw "malformed PKCS8 private key(code:005)"; // AlgId.oid is not OID

            result.algoid = _getV(pkcs8PrvHex, a2[0]);

            // 2.2. AlgID param
            if (pkcs8PrvHex.substr(a2[1], 2) == "06") {
                result.algparam = _getV(pkcs8PrvHex, a2[1]);
            }

            // 3. Key index
            if (pkcs8PrvHex.substr(a1[2], 2) != "04")
                throw "malformed PKCS8 private key(code:006)"; // not octet string

            result.keyidx = _ASN1HEX.getVidx(pkcs8PrvHex, a1[2]);

            return result;
        },

        /**
         * get RSAKey/ECDSA private key object from PEM plain PEM PKCS#8 private key
         * @name getKeyFromPlainPrivatePKCS8PEM
         * @memberOf KEYUTIL
         * @function
         * @param {String} pkcs8PEM string of plain PEM formatted PKCS#8 private key
         * @return {Object} RSAKey or KJUR.crypto.ECDSA private key object
         * @since pkcs5pkey 1.0.5
         */
        getKeyFromPlainPrivatePKCS8PEM: function(prvKeyPEM) {
            var prvKeyHex = pemtohex(prvKeyPEM, "PRIVATE KEY");
            var key = this.getKeyFromPlainPrivatePKCS8Hex(prvKeyHex);
            return key;
        },

        /**
         * get RSAKey/DSA/ECDSA private key object from HEX plain PEM PKCS#8 private key
         * @name getKeyFromPlainPrivatePKCS8Hex
         * @memberOf KEYUTIL
         * @function
         * @param {String} prvKeyHex hexadecimal string of plain PKCS#8 private key
         * @return {Object} RSAKey or KJUR.crypto.{DSA,ECDSA} private key object
         * @since pkcs5pkey 1.0.5
         */
        getKeyFromPlainPrivatePKCS8Hex: function(prvKeyHex) {
            var p8 = this.parsePlainPrivatePKCS8Hex(prvKeyHex);
	    var key;
            
            if (p8.algoid == "2a864886f70d010101") { // RSA
		key = new RSAKey();
	    } else if (p8.algoid == "2a8648ce380401") { // DSA
		key = new KJUR.crypto.DSA();
            } else if (p8.algoid == "2a8648ce3d0201") { // ECC
                key = new KJUR.crypto.ECDSA();
            } else {
                throw "unsupported private key algorithm";
            }

	    key.readPKCS8PrvKeyHex(prvKeyHex);
	    return key;
        },

        // === PKCS8 RSA Public Key ================================================

        /*
         * get RSAKey/DSA/ECDSA public key object from hexadecimal string of PKCS#8 public key
         * @name _getKeyFromPublicPKCS8Hex
         * @memberOf KEYUTIL
         * @function
         * @param {String} pkcsPub8Hex hexadecimal string of PKCS#8 public key
         * @return {Object} RSAKey or KJUR.crypto.{ECDSA,DSA} private key object
         * @since pkcs5pkey 1.0.5
         */
        _getKeyFromPublicPKCS8Hex: function(h) {
	    var key;
	    var hOID = ASN1HEX.getVbyList(h, 0, [0, 0], "06");

	    if (hOID === "2a864886f70d010101") {    // oid=RSA
		key = new RSAKey();
	    } else if (hOID === "2a8648ce380401") { // oid=DSA
		key = new KJUR.crypto.DSA();
	    } else if (hOID === "2a8648ce3d0201") { // oid=ECPUB
		key = new KJUR.crypto.ECDSA();
	    } else {
		throw "unsupported PKCS#8 public key hex";
	    }
	    key.readPKCS8PubKeyHex(h);
	    return key;
	},

        /**
         * parse hexadecimal string of plain PKCS#8 private key
         * @name parsePublicRawRSAKeyHex
         * @memberOf KEYUTIL
         * @function
         * @param {String} pubRawRSAHex hexadecimal string of ASN.1 encoded PKCS#8 public key
         * @return {Array} associative array of parsed key
         * @since pkcs5pkey 1.0.5
         * @description
         * Resulted associative array has following properties:
         * <ul>
         * <li>n - hexadecimal string of public key
         * <li>e - hexadecimal string of public exponent
         * </ul>
         */
        parsePublicRawRSAKeyHex: function(pubRawRSAHex) {
	    var _ASN1HEX = ASN1HEX;
	    var _getChildIdx = _ASN1HEX.getChildIdx;
	    var _getV = _ASN1HEX.getV;
            var result = {};
            
            // 1. Sequence
            if (pubRawRSAHex.substr(0, 2) != "30")
                throw "malformed RSA key(code:001)"; // not sequence
            
            var a1 = _getChildIdx(pubRawRSAHex, 0);
            if (a1.length != 2)
                throw "malformed RSA key(code:002)"; // not 2 items in seq

            // 2. public key "N"
            if (pubRawRSAHex.substr(a1[0], 2) != "02")
                throw "malformed RSA key(code:003)"; // 1st item is not integer

            result.n = _getV(pubRawRSAHex, a1[0]);

            // 3. public key "E"
            if (pubRawRSAHex.substr(a1[1], 2) != "02")
                throw "malformed RSA key(code:004)"; // 2nd item is not integer

            result.e = _getV(pubRawRSAHex, a1[1]);

            return result;
        },

        /**
         * parse hexadecimal string of PKCS#8 RSA/EC/DSA public key
         * @name parsePublicPKCS8Hex
         * @memberOf KEYUTIL
         * @function
         * @param {String} pkcs8PubHex hexadecimal string of PKCS#8 public key
         * @return {Hash} hash of key information
         * @description
         * Resulted hash has following attributes.
         * <ul>
         * <li>algoid - hexadecimal string of OID of asymmetric key algorithm</li>
         * <li>algparam - hexadecimal string of OID of ECC curve name, parameter SEQUENCE of DSA or null</li>
         * <li>key - hexadecimal string of public key</li>
         * </ul>
         */
        parsePublicPKCS8Hex: function(pkcs8PubHex) {
	    var _ASN1HEX = ASN1HEX;
	    var _getChildIdx = _ASN1HEX.getChildIdx;
	    var _getV = _ASN1HEX.getV;
            var result = {};
            result.algparam = null;

            // 1. AlgID and Key bit string
            var a1 = _getChildIdx(pkcs8PubHex, 0);
            if (a1.length != 2)
                throw "outer DERSequence shall have 2 elements: " + a1.length;

            // 2. AlgID
            var idxAlgIdTLV = a1[0];
            if (pkcs8PubHex.substr(idxAlgIdTLV, 2) != "30")
                throw "malformed PKCS8 public key(code:001)"; // AlgId not sequence

            var a2 = _getChildIdx(pkcs8PubHex, idxAlgIdTLV);
            if (a2.length != 2)
                throw "malformed PKCS8 public key(code:002)"; // AlgId not have two elements

            // 2.1. AlgID OID
            if (pkcs8PubHex.substr(a2[0], 2) != "06")
                throw "malformed PKCS8 public key(code:003)"; // AlgId.oid is not OID

            result.algoid = _getV(pkcs8PubHex, a2[0]);

            // 2.2. AlgID param
            if (pkcs8PubHex.substr(a2[1], 2) == "06") { // OID for EC
                result.algparam = _getV(pkcs8PubHex, a2[1]);
            } else if (pkcs8PubHex.substr(a2[1], 2) == "30") { // SEQ for DSA
                result.algparam = {};
                result.algparam.p = _ASN1HEX.getVbyList(pkcs8PubHex, a2[1], [0], "02");
                result.algparam.q = _ASN1HEX.getVbyList(pkcs8PubHex, a2[1], [1], "02");
                result.algparam.g = _ASN1HEX.getVbyList(pkcs8PubHex, a2[1], [2], "02");
            }

            // 3. Key
            if (pkcs8PubHex.substr(a1[1], 2) != "03")
                throw "malformed PKCS8 public key(code:004)"; // Key is not bit string

            result.key = _getV(pkcs8PubHex, a1[1]).substr(2);
            
            // 4. return result assoc array
            return result;
        },
    };
}();

// -- MAJOR PUBLIC METHODS -------------------------------------------------------
/**
 * get private or public key object from any arguments
 * @name getKey
 * @memberOf KEYUTIL
 * @function
 * @static
 * @param {Object} param parameter to get key object. see description in detail.
 * @param {String} passcode (OPTION) parameter to get key object. see description in detail.
 * @param {String} hextype (OPTOIN) parameter to get key object. see description in detail.
 * @return {Object} {@link RSAKey}, {@link KJUR.crypto.ECDSA} or {@link KJUR.crypto.ECDSA} object
 * @since keyutil 1.0.0
 * @description
 * This method gets private or public key object({@link RSAKey}, {@link KJUR.crypto.DSA} or {@link KJUR.crypto.ECDSA})
 * for RSA, DSA and ECC.
 * Arguments for this methods depends on a key format you specify.
 * Following key representations are supported.
 * <ul>
 * <li>ECC private/public key object(as is): param=KJUR.crypto.ECDSA</li>
 * <li>DSA private/public key object(as is): param=KJUR.crypto.DSA</li>
 * <li>RSA private/public key object(as is): param=RSAKey </li>
 * <li>ECC private key parameters: param={d: d, curve: curveName}</li>
 * <li>RSA private key parameters: param={n: n, e: e, d: d, p: p, q: q, dp: dp, dq: dq, co: co}<br/>
 * NOTE: Each value shall be hexadecimal string of key spec.</li>
 * <li>DSA private key parameters: param={p: p, q: q, g: g, y: y, x: x}<br/>
 * NOTE: Each value shall be hexadecimal string of key spec.</li>
 * <li>ECC public key parameters: param={xy: xy, curve: curveName}<br/>
 * NOTE: ECC public key 'xy' shall be concatination of "04", x-bytes-hex and y-bytes-hex.</li>
 * <li>DSA public key parameters: param={p: p, q: q, g: g, y: y}<br/>
 * NOTE: Each value shall be hexadecimal string of key spec.</li>
 * <li>RSA public key parameters: param={n: n, e: e} </li>
 * <li>X.509v1/v3 PEM certificate (RSA/DSA/ECC): param=pemString</li>
 * <li>PKCS#8 hexadecimal RSA/ECC public key: param=pemString, null, "pkcs8pub"</li>
 * <li>PKCS#8 PEM RSA/DSA/ECC public key: param=pemString</li>
 * <li>PKCS#5 plain hexadecimal RSA private key: param=hexString, null, "pkcs5prv"</li>
 * <li>PKCS#5 plain PEM DSA/RSA private key: param=pemString</li>
 * <li>PKCS#8 plain PEM RSA/ECDSA private key: param=pemString</li>
 * <li>PKCS#5 encrypted PEM RSA/DSA private key: param=pemString, passcode</li>
 * <li>PKCS#8 encrypted PEM RSA/ECDSA private key: param=pemString, passcode</li>
 * </ul>
 * Please note following limitation on encrypted keys:
 * <ul>
 * <li>Encrypted PKCS#8 only supports PBKDF2/HmacSHA1/3DES</li>
 * <li>Encrypted PKCS#5 supports DES-CBC, DES-EDE3-CBC, AES-{128,192.256}-CBC</li>
 * <li>JWT plain ECC private/public key</li>
 * <li>JWT plain RSA public key</li>
 * <li>JWT plain RSA private key with P/Q/DP/DQ/COEFF</li>
 * <li>JWT plain RSA private key without P/Q/DP/DQ/COEFF (since jsrsasign 5.0.0)</li>
 * </ul>
 * NOTE1: <a href="https://tools.ietf.org/html/rfc7517">RFC 7517 JSON Web Key(JWK)</a> support for RSA/ECC private/public key from jsrsasign 4.8.1.<br/>
 * NOTE2: X509v1 support is added since jsrsasign 5.0.11.
 * 
 * <h5>EXAMPLE</h5>
 * @example
 * // 1. loading private key from PEM string
 * keyObj = KEYUTIL.getKey("-----BEGIN RSA PRIVATE KEY...");
 * keyObj = KEYUTIL.getKey("-----BEGIN RSA PRIVATE KEY..., "passcode");
 * keyObj = KEYUTIL.getKey("-----BEGIN PRIVATE KEY...");
 * keyObj = KEYUTIL.getKey("-----BEGIN PRIVATE KEY...", "passcode");
 * // 2. loading public key from PEM string
 * keyObj = KEYUTIL.getKey("-----BEGIN PUBLIC KEY...");
 * keyObj = KEYUTIL.getKey("-----BEGIN X509 CERTIFICATE...");
 * // 3. loading hexadecimal PKCS#5/PKCS#8 key
 * keyObj = KEYUTIL.getKey("308205c1...", null, "pkcs8pub");
 * keyObj = KEYUTIL.getKey("3082048b...", null, "pkcs5prv");
 * // 4. loading JSON Web Key(JWK)
 * keyObj = KEYUTIL.getKey({kty: "RSA", n: "0vx7...", e: "AQAB"});
 * keyObj = KEYUTIL.getKey({kty: "EC", crv: "P-256", 
 *                          x: "MKBC...", y: "4Etl6...", d: "870Mb..."});
 * // 5. bare hexadecimal key
 * keyObj = KEYUTIL.getKey({n: "75ab..", e: "010001"});
 */
KEYUTIL.getKey = function(param, passcode, hextype) {
    var _ASN1HEX = ASN1HEX,
	_getChildIdx = _ASN1HEX.getChildIdx,
	_getV = _ASN1HEX.getV,
	_getVbyList = _ASN1HEX.getVbyList,
	_KJUR_crypto = KJUR.crypto,
	_KJUR_crypto_ECDSA = _KJUR_crypto.ECDSA,
	_KJUR_crypto_DSA = _KJUR_crypto.DSA,
	_RSAKey = RSAKey,
	_pemtohex = pemtohex,
	_KEYUTIL = KEYUTIL;

    // 1. by key RSAKey/KJUR.crypto.ECDSA/KJUR.crypto.DSA object
    if (typeof _RSAKey != 'undefined' && param instanceof _RSAKey)
        return param;
    if (typeof _KJUR_crypto_ECDSA != 'undefined' && param instanceof _KJUR_crypto_ECDSA)
        return param;
    if (typeof _KJUR_crypto_DSA != 'undefined' && param instanceof _KJUR_crypto_DSA)
        return param;

    // 2. by parameters of key

    // 2.1. bare ECC
    // 2.1.1. bare ECC public key by hex values
    if (param.curve !== undefined &&
	param.xy !== undefined && param.d === undefined) {
        return new _KJUR_crypto_ECDSA({pub: param.xy, curve: param.curve});
    }

    // 2.1.2. bare ECC private key by hex values
    if (param.curve !== undefined && param.d !== undefined) {
        return new _KJUR_crypto_ECDSA({prv: param.d, curve: param.curve});
    }

    // 2.2. bare RSA
    // 2.2.1. bare RSA public key by hex values
    if (param.kty === undefined &&
	param.n !== undefined && param.e !== undefined &&
        param.d === undefined) {
        var key = new _RSAKey();
        key.setPublic(param.n, param.e);
        return key;
    }

    // 2.2.2. bare RSA private key with P/Q/DP/DQ/COEFF by hex values
    if (param.kty === undefined &&
	param.n !== undefined &&
	param.e !== undefined &&
	param.d !== undefined &&
        param.p !== undefined &&
	param.q !== undefined &&
        param.dp !== undefined &&
	param.dq !== undefined &&
	param.co !== undefined &&
        param.qi === undefined) {
        var key = new _RSAKey();
        key.setPrivateEx(param.n, param.e, param.d, param.p, param.q,
                         param.dp, param.dq, param.co);
        return key;
    }

    // 2.2.3. bare RSA public key without P/Q/DP/DQ/COEFF by hex values
    if (param.kty === undefined &&
	param.n !== undefined &&
	param.e !== undefined &&
	param.d !== undefined &&
        param.p === undefined) {
        var key = new _RSAKey();
        key.setPrivate(param.n, param.e, param.d);
        return key;
    }

    // 2.3. bare DSA
    // 2.3.1. bare DSA public key by hex values
    if (param.p !== undefined && param.q !== undefined &&
	param.g !== undefined &&
        param.y !== undefined && param.x === undefined) {
        var key = new _KJUR_crypto_DSA();
        key.setPublic(param.p, param.q, param.g, param.y);
        return key;
    }

    // 2.3.2. bare DSA private key by hex values
    if (param.p !== undefined && param.q !== undefined &&
	param.g !== undefined &&
        param.y !== undefined && param.x !== undefined) {
        var key = new _KJUR_crypto_DSA();
        key.setPrivate(param.p, param.q, param.g, param.y, param.x);
        return key;
    }

    // 3. JWK
    // 3.1. JWK RSA
    // 3.1.1. JWK RSA public key by b64u values
    if (param.kty === "RSA" &&
	param.n !== undefined &&
	param.e !== undefined &&
	param.d === undefined) {
	var key = new _RSAKey();
	key.setPublic(b64utohex(param.n), b64utohex(param.e));
	return key;
    }

    // 3.1.2. JWK RSA private key with p/q/dp/dq/coeff by b64u values
    if (param.kty === "RSA" &&
	param.n !== undefined &&
	param.e !== undefined &&
	param.d !== undefined &&
	param.p !== undefined &&
	param.q !== undefined &&
	param.dp !== undefined &&
	param.dq !== undefined &&
	param.qi !== undefined) {
	var key = new _RSAKey();
        key.setPrivateEx(b64utohex(param.n),
			 b64utohex(param.e),
			 b64utohex(param.d),
			 b64utohex(param.p),
			 b64utohex(param.q),
                         b64utohex(param.dp),
			 b64utohex(param.dq),
			 b64utohex(param.qi));
	return key;
    }

    // 3.1.3. JWK RSA private key without p/q/dp/dq/coeff by b64u
    //        since jsrsasign 5.0.0 keyutil 1.0.11
    if (param.kty === "RSA" &&
	param.n !== undefined &&
	param.e !== undefined &&
	param.d !== undefined) {
	var key = new _RSAKey();
        key.setPrivate(b64utohex(param.n),
		       b64utohex(param.e),
		       b64utohex(param.d));
	return key;
    }

    // 3.2. JWK ECC
    // 3.2.1. JWK ECC public key by b64u values
    if (param.kty === "EC" &&
	param.crv !== undefined &&
	param.x !== undefined &&
	param.y !== undefined &&
        param.d === undefined) {
	var ec = new _KJUR_crypto_ECDSA({"curve": param.crv});
	var charlen = ec.ecparams.keylen / 4;
        var hX   = ("0000000000" + b64utohex(param.x)).slice(- charlen);
        var hY   = ("0000000000" + b64utohex(param.y)).slice(- charlen);
        var hPub = "04" + hX + hY;
	ec.setPublicKeyHex(hPub);
	return ec;
    }

    // 3.2.2. JWK ECC private key by b64u values
    if (param.kty === "EC" &&
	param.crv !== undefined &&
	param.x !== undefined &&
	param.y !== undefined &&
        param.d !== undefined) {
	var ec = new _KJUR_crypto_ECDSA({"curve": param.crv});
	var charlen = ec.ecparams.keylen / 4;
        var hX   = ("0000000000" + b64utohex(param.x)).slice(- charlen);
        var hY   = ("0000000000" + b64utohex(param.y)).slice(- charlen);
        var hPub = "04" + hX + hY;
        var hPrv = ("0000000000" + b64utohex(param.d)).slice(- charlen);
	ec.setPublicKeyHex(hPub);
	ec.setPrivateKeyHex(hPrv);
	return ec;
    }
    
    // 4. (plain) hexadecimal data
    // 4.1. get private key by PKCS#5 plain RSA/DSA/ECDSA hexadecimal string
    if (hextype === "pkcs5prv") {
	var h = param, _ASN1HEX = ASN1HEX, a, key;
	a = _getChildIdx(h, 0);
	if (a.length === 9) {        // RSA (INT x 9)
	    key = new _RSAKey();
            key.readPKCS5PrvKeyHex(h);
	} else if (a.length === 6) { // DSA (INT x 6)
	    key = new _KJUR_crypto_DSA();
	    key.readPKCS5PrvKeyHex(h);
	} else if (a.length > 2 &&   // ECDSA (INT, OCT prv, [0] curve, [1] pub)
		   h.substr(a[1], 2) === "04") {
	    key = new _KJUR_crypto_ECDSA();
	    key.readPKCS5PrvKeyHex(h);
	} else {
	    throw "unsupported PKCS#1/5 hexadecimal key";
	}

        return key;
    }

    // 4.2. get private key by PKCS#8 plain RSA/DSA/ECDSA hexadecimal string
    if (hextype === "pkcs8prv") {
	var key = _KEYUTIL.getKeyFromPlainPrivatePKCS8Hex(param);
        return key;
    }

    // 4.3. get public key by PKCS#8 RSA/DSA/ECDSA hexadecimal string
    if (hextype === "pkcs8pub") {
        return _KEYUTIL._getKeyFromPublicPKCS8Hex(param);
    }

    // 4.4. get public key by X.509 hexadecimal string for RSA/DSA/ECDSA
    if (hextype === "x509pub") {
        return X509.getPublicKeyFromCertHex(param);
    }

    // 5. by PEM certificate (-----BEGIN ... CERTIFICATE----)
    if (param.indexOf("-END CERTIFICATE-", 0) != -1 ||
        param.indexOf("-END X509 CERTIFICATE-", 0) != -1 ||
        param.indexOf("-END TRUSTED CERTIFICATE-", 0) != -1) {
        return X509.getPublicKeyFromCertPEM(param);
    }

    // 6. public key by PKCS#8 PEM string
    if (param.indexOf("-END PUBLIC KEY-") != -1) {
        var pubKeyHex = pemtohex(param, "PUBLIC KEY");
        return _KEYUTIL._getKeyFromPublicPKCS8Hex(pubKeyHex);
    }
    
    // 8.1 private key by plain PKCS#5 PEM RSA string 
    //    getKey("-----BEGIN RSA PRIVATE KEY-...")
    if (param.indexOf("-END RSA PRIVATE KEY-") != -1 &&
        param.indexOf("4,ENCRYPTED") == -1) {
        var hex = _pemtohex(param, "RSA PRIVATE KEY");
        return _KEYUTIL.getKey(hex, null, "pkcs5prv");
    }

    // 8.2. private key by plain PKCS#5 PEM DSA string
    if (param.indexOf("-END DSA PRIVATE KEY-") != -1 &&
        param.indexOf("4,ENCRYPTED") == -1) {

        var hKey = _pemtohex(param, "DSA PRIVATE KEY");
        var p = _getVbyList(hKey, 0, [1], "02");
        var q = _getVbyList(hKey, 0, [2], "02");
        var g = _getVbyList(hKey, 0, [3], "02");
        var y = _getVbyList(hKey, 0, [4], "02");
        var x = _getVbyList(hKey, 0, [5], "02");
        var key = new _KJUR_crypto_DSA();
        key.setPrivate(new BigInteger(p, 16),
                       new BigInteger(q, 16),
                       new BigInteger(g, 16),
                       new BigInteger(y, 16),
                       new BigInteger(x, 16));
        return key;
    }

    // 10. private key by plain PKCS#8 PEM ECC/RSA string
    if (param.indexOf("-END PRIVATE KEY-") != -1) {
        return _KEYUTIL.getKeyFromPlainPrivatePKCS8PEM(param);
    }

    // 11.1 private key by encrypted PKCS#5 PEM RSA string
    if (param.indexOf("-END RSA PRIVATE KEY-") != -1 &&
        param.indexOf("4,ENCRYPTED") != -1) {
        var hPKey = _KEYUTIL.getDecryptedKeyHex(param, passcode);
        var rsaKey = new RSAKey();
        rsaKey.readPKCS5PrvKeyHex(hPKey);
        return rsaKey;
    }

    // 11.2. private key by encrypted PKCS#5 PEM ECDSA string
    if (param.indexOf("-END EC PRIVATE KEY-") != -1 &&
        param.indexOf("4,ENCRYPTED") != -1) {
        var hKey = _KEYUTIL.getDecryptedKeyHex(param, passcode);

        var key = _getVbyList(hKey, 0, [1], "04");
        var curveNameOidHex = _getVbyList(hKey, 0, [2,0], "06");
        var pubkey = _getVbyList(hKey, 0, [3,0], "03").substr(2);
        var curveName = "";

        if (KJUR.crypto.OID.oidhex2name[curveNameOidHex] !== undefined) {
            curveName = KJUR.crypto.OID.oidhex2name[curveNameOidHex];
        } else {
            throw "undefined OID(hex) in KJUR.crypto.OID: " + curveNameOidHex;
        }

        var ec = new _KJUR_crypto_ECDSA({'curve': curveName});
        ec.setPublicKeyHex(pubkey);
        ec.setPrivateKeyHex(key);
        ec.isPublic = false;
        return ec;
    }

    // 11.3. private key by encrypted PKCS#5 PEM DSA string
    if (param.indexOf("-END DSA PRIVATE KEY-") != -1 &&
        param.indexOf("4,ENCRYPTED") != -1) {
        var hKey = _KEYUTIL.getDecryptedKeyHex(param, passcode);
        var p = _getVbyList(hKey, 0, [1], "02");
        var q = _getVbyList(hKey, 0, [2], "02");
        var g = _getVbyList(hKey, 0, [3], "02");
        var y = _getVbyList(hKey, 0, [4], "02");
        var x = _getVbyList(hKey, 0, [5], "02");
        var key = new _KJUR_crypto_DSA();
        key.setPrivate(new BigInteger(p, 16),
                       new BigInteger(q, 16),
                       new BigInteger(g, 16),
                       new BigInteger(y, 16),
                       new BigInteger(x, 16));
        return key;
    }

    // 11. private key by encrypted PKCS#8 hexadecimal RSA/ECDSA string
    if (param.indexOf("-END ENCRYPTED PRIVATE KEY-") != -1) {
        return _KEYUTIL.getKeyFromEncryptedPKCS8PEM(param, passcode);
    }

    throw "not supported argument";
};

/**
 * @name generateKeypair
 * @memberOf KEYUTIL
 * @function
 * @static
 * @param {String} alg 'RSA' or 'EC'
 * @param {Object} keylenOrCurve key length for RSA or curve name for EC
 * @return {Array} associative array of keypair which has prvKeyObj and pubKeyObj parameters
 * @since keyutil 1.0.1
 * @description
 * This method generates a key pair of public key algorithm.
 * The result will be an associative array which has following
 * parameters:
 * <ul>
 * <li>prvKeyObj - RSAKey or ECDSA object of private key</li>
 * <li>pubKeyObj - RSAKey or ECDSA object of public key</li>
 * </ul>
 * NOTE1: As for RSA algoirthm, public exponent has fixed
 * value '0x10001'.
 * NOTE2: As for EC algorithm, supported names of curve are
 * secp256r1, secp256k1 and secp384r1.
 * NOTE3: DSA is not supported yet.
 * @example
 * var rsaKeypair = KEYUTIL.generateKeypair("RSA", 1024);
 * var ecKeypair = KEYUTIL.generateKeypair("EC", "secp256r1");
 *
 */
KEYUTIL.generateKeypair = function(alg, keylenOrCurve) {
    if (alg == "RSA") {
        var keylen = keylenOrCurve;
        var prvKey = new RSAKey();
        prvKey.generate(keylen, '10001');
        prvKey.isPrivate = true;
        prvKey.isPublic = true;
        
        var pubKey = new RSAKey();
        var hN = prvKey.n.toString(16);
        var hE = prvKey.e.toString(16);
        pubKey.setPublic(hN, hE);
        pubKey.isPrivate = false;
        pubKey.isPublic = true;
        
        var result = {};
        result.prvKeyObj = prvKey;
        result.pubKeyObj = pubKey;
        return result;
    } else if (alg == "EC") {
        var curve = keylenOrCurve;
        var ec = new KJUR.crypto.ECDSA({curve: curve});
        var keypairHex = ec.generateKeyPairHex();

        var prvKey = new KJUR.crypto.ECDSA({curve: curve});
        prvKey.setPublicKeyHex(keypairHex.ecpubhex);
        prvKey.setPrivateKeyHex(keypairHex.ecprvhex);
        prvKey.isPrivate = true;
        prvKey.isPublic = false;

        var pubKey = new KJUR.crypto.ECDSA({curve: curve});
        pubKey.setPublicKeyHex(keypairHex.ecpubhex);
        pubKey.isPrivate = false;
        pubKey.isPublic = true;

        var result = {};
        result.prvKeyObj = prvKey;
        result.pubKeyObj = pubKey;
        return result;
    } else {
        throw "unknown algorithm: " + alg;
    }
};

/**
 * get PEM formatted private or public key file from a RSA/ECDSA/DSA key object
 * @name getPEM
 * @memberOf KEYUTIL
 * @function
 * @static
 * @param {Object} keyObjOrHex key object {@link RSAKey}, {@link KJUR.crypto.ECDSA} or {@link KJUR.crypto.DSA} to encode to
 * @param {String} formatType (OPTION) output format type of "PKCS1PRV", "PKCS5PRV" or "PKCS8PRV" for private key
 * @param {String} passwd (OPTION) password to protect private key
 * @param {String} encAlg (OPTION) encryption algorithm for PKCS#5. currently supports DES-CBC, DES-EDE3-CBC and AES-{128,192,256}-CBC
 * @param {String} hexType (OPTION) type of hex string (ex. pkcs5prv, pkcs8prv)
 * @param {String} ivsaltHex hexadecimal string of IV and salt (default generated random IV)
 * @since keyutil 1.0.4
 * @description
 * <dl>
 * <dt><b>NOTE1:</b>
 * <dd>
 * PKCS#5 encrypted private key protection algorithm supports DES-CBC, 
 * DES-EDE3-CBC and AES-{128,192,256}-CBC
 * <dt><b>NOTE2:</b>
 * <dd>
 * OpenSSL supports
 * <dt><b>NOTE3:</b>
 * <dd>
 * Parameter "ivsaltHex" supported since jsrsasign 8.0.0 keyutil 1.2.0.
 * </dl>
 * @example
 * KEUUTIL.getPEM(publicKey) =&gt; generates PEM PKCS#8 public key 
 * KEUUTIL.getPEM(privateKey, "PKCS1PRV") =&gt; generates PEM PKCS#1 plain private key
 * KEUUTIL.getPEM(privateKey, "PKCS5PRV", "pass") =&gt; generates PEM PKCS#5 encrypted private key 
 *                                                          with DES-EDE3-CBC (DEFAULT)
 * KEUUTIL.getPEM(privateKey, "PKCS5PRV", "pass", "DES-CBC") =&gt; generates PEM PKCS#5 encrypted 
 *                                                                 private key with DES-CBC
 * KEUUTIL.getPEM(privateKey, "PKCS8PRV") =&gt; generates PEM PKCS#8 plain private key
 * KEUUTIL.getPEM(privateKey, "PKCS8PRV", "pass") =&gt; generates PEM PKCS#8 encrypted private key
 *                                                      with PBKDF2_HmacSHA1_3DES
 */
KEYUTIL.getPEM = function(keyObjOrHex, formatType, passwd, encAlg, hexType, ivsaltHex) {
    var _KJUR = KJUR,
	_KJUR_asn1 = _KJUR.asn1,
	_DERObjectIdentifier = _KJUR_asn1.DERObjectIdentifier,
	_DERInteger = _KJUR_asn1.DERInteger,
	_newObject = _KJUR_asn1.ASN1Util.newObject,
	_KJUR_asn1_x509 = _KJUR_asn1.x509,
	_SubjectPublicKeyInfo = _KJUR_asn1_x509.SubjectPublicKeyInfo,
	_KJUR_crypto = _KJUR.crypto,
	_DSA = _KJUR_crypto.DSA,
	_ECDSA = _KJUR_crypto.ECDSA,
	_RSAKey = RSAKey;

    function _rsaprv2asn1obj(keyObjOrHex) {
        var asn1Obj = _newObject({
            "seq": [
                {"int": 0 },
                {"int": {"bigint": keyObjOrHex.n}},
                {"int": keyObjOrHex.e},
                {"int": {"bigint": keyObjOrHex.d}},
                {"int": {"bigint": keyObjOrHex.p}},
                {"int": {"bigint": keyObjOrHex.q}},
                {"int": {"bigint": keyObjOrHex.dmp1}},
                {"int": {"bigint": keyObjOrHex.dmq1}},
                {"int": {"bigint": keyObjOrHex.coeff}}
            ]
        });
        return asn1Obj;
    };

    function _ecdsaprv2asn1obj(keyObjOrHex) {
        var asn1Obj2 = _newObject({
            "seq": [
                {"int": 1 },
                {"octstr": {"hex": keyObjOrHex.prvKeyHex}},
                {"tag": ['a0', true, {'oid': {'name': keyObjOrHex.curveName}}]},
                {"tag": ['a1', true, {'bitstr': {'hex': '00' + keyObjOrHex.pubKeyHex}}]}
            ]
        });
        return asn1Obj2;
    };

    function _dsaprv2asn1obj(keyObjOrHex) {
        var asn1Obj = _newObject({
            "seq": [
                {"int": 0 },
                {"int": {"bigint": keyObjOrHex.p}},
                {"int": {"bigint": keyObjOrHex.q}},
                {"int": {"bigint": keyObjOrHex.g}},
                {"int": {"bigint": keyObjOrHex.y}},
                {"int": {"bigint": keyObjOrHex.x}}
            ]
        });
        return asn1Obj;
    };

    // 1. public key

    // x. PEM PKCS#8 public key of RSA/ECDSA/DSA public key object
    if (((_RSAKey !== undefined && keyObjOrHex instanceof _RSAKey) ||
         (_DSA !== undefined    && keyObjOrHex instanceof _DSA) ||
         (_ECDSA !== undefined  && keyObjOrHex instanceof _ECDSA)) &&
        keyObjOrHex.isPublic == true &&
        (formatType === undefined || formatType == "PKCS8PUB")) {
        var asn1Obj = new _SubjectPublicKeyInfo(keyObjOrHex);
        var asn1Hex = asn1Obj.getEncodedHex();
        return hextopem(asn1Hex, "PUBLIC KEY");
    }
    
    // 2. private

    // x. PEM PKCS#1 plain private key of RSA private key object
    if (formatType == "PKCS1PRV" &&
        _RSAKey !== undefined &&
        keyObjOrHex instanceof _RSAKey &&
        (passwd === undefined || passwd == null) &&
        keyObjOrHex.isPrivate  == true) {

        var asn1Obj = _rsaprv2asn1obj(keyObjOrHex);
        var asn1Hex = asn1Obj.getEncodedHex();
        return hextopem(asn1Hex, "RSA PRIVATE KEY");
    }

    // x. PEM PKCS#1 plain private key of ECDSA private key object
    if (formatType == "PKCS1PRV" &&
        _ECDSA !== undefined &&
        keyObjOrHex instanceof _ECDSA &&
        (passwd === undefined || passwd == null) &&
        keyObjOrHex.isPrivate  == true) {

        var asn1Obj1 = 
	    new _DERObjectIdentifier({'name': keyObjOrHex.curveName});
        var asn1Hex1 = asn1Obj1.getEncodedHex();
        var asn1Obj2 = _ecdsaprv2asn1obj(keyObjOrHex);
        var asn1Hex2 = asn1Obj2.getEncodedHex();

        var s = "";
        s += hextopem(asn1Hex1, "EC PARAMETERS");
        s += hextopem(asn1Hex2, "EC PRIVATE KEY");
        return s;
    }

    // x. PEM PKCS#1 plain private key of DSA private key object
    if (formatType == "PKCS1PRV" &&
        _DSA !== undefined &&
        keyObjOrHex instanceof _DSA &&
        (passwd === undefined || passwd == null) &&
        keyObjOrHex.isPrivate  == true) {

        var asn1Obj = _dsaprv2asn1obj(keyObjOrHex);
        var asn1Hex = asn1Obj.getEncodedHex();
        return hextopem(asn1Hex, "DSA PRIVATE KEY");
    }

    // 3. private

    // x. PEM PKCS#5 encrypted private key of RSA private key object
    if (formatType == "PKCS5PRV" &&
        _RSAKey !== undefined &&
        keyObjOrHex instanceof _RSAKey &&
        (passwd !== undefined && passwd != null) &&
        keyObjOrHex.isPrivate  == true) {

        var asn1Obj = _rsaprv2asn1obj(keyObjOrHex);
        var asn1Hex = asn1Obj.getEncodedHex();

        if (encAlg === undefined) encAlg = "DES-EDE3-CBC";
        return this.getEncryptedPKCS5PEMFromPrvKeyHex("RSA", asn1Hex, passwd, encAlg, ivsaltHex);
    }

    // x. PEM PKCS#5 encrypted private key of ECDSA private key object
    if (formatType == "PKCS5PRV" &&
        _ECDSA !== undefined &&
        keyObjOrHex instanceof _ECDSA &&
        (passwd !== undefined && passwd != null) &&
        keyObjOrHex.isPrivate  == true) {

        var asn1Obj = _ecdsaprv2asn1obj(keyObjOrHex);
        var asn1Hex = asn1Obj.getEncodedHex();

        if (encAlg === undefined) encAlg = "DES-EDE3-CBC";
        return this.getEncryptedPKCS5PEMFromPrvKeyHex("EC", asn1Hex, passwd, encAlg, ivsaltHex);
    }

    // x. PEM PKCS#5 encrypted private key of DSA private key object
    if (formatType == "PKCS5PRV" &&
        _DSA !== undefined &&
        keyObjOrHex instanceof _DSA &&
        (passwd !== undefined && passwd != null) &&
        keyObjOrHex.isPrivate  == true) {

        var asn1Obj = _dsaprv2asn1obj(keyObjOrHex);
        var asn1Hex = asn1Obj.getEncodedHex();

        if (encAlg === undefined) encAlg = "DES-EDE3-CBC";
        return this.getEncryptedPKCS5PEMFromPrvKeyHex("DSA", asn1Hex, passwd, encAlg, ivsaltHex);
    }

    // x. ======================================================================

    var _getEncryptedPKCS8 = function(plainKeyHex, passcode) {
        var info = _getEencryptedPKCS8Info(plainKeyHex, passcode);
        //alert("iv=" + info.encryptionSchemeIV);
        //alert("info.ciphertext2[" + info.ciphertext.length + "=" + info.ciphertext);
        var asn1Obj = new _newObject({
            "seq": [
                {"seq": [
                    {"oid": {"name": "pkcs5PBES2"}},
                    {"seq": [
                        {"seq": [
                            {"oid": {"name": "pkcs5PBKDF2"}},
                            {"seq": [
                                {"octstr": {"hex": info.pbkdf2Salt}},
                                {"int": info.pbkdf2Iter}
                            ]}
                        ]},
                        {"seq": [
                            {"oid": {"name": "des-EDE3-CBC"}},
                            {"octstr": {"hex": info.encryptionSchemeIV}}
                        ]}
                    ]}
                ]},
                {"octstr": {"hex": info.ciphertext}}
            ]
        });
        return asn1Obj.getEncodedHex();
    };

    var _getEencryptedPKCS8Info = function(plainKeyHex, passcode) {
        var pbkdf2Iter = 100;
        var pbkdf2SaltWS = CryptoJS.lib.WordArray.random(8);
        var encryptionSchemeAlg = "DES-EDE3-CBC";
        var encryptionSchemeIVWS = CryptoJS.lib.WordArray.random(8);
        // PBKDF2 key
        var pbkdf2KeyWS = CryptoJS.PBKDF2(passcode, 
                                          pbkdf2SaltWS, { "keySize": 192/32,
                                                          "iterations": pbkdf2Iter });
        // ENCRYPT
        var plainKeyWS = CryptoJS.enc.Hex.parse(plainKeyHex);
        var encryptedKeyHex = 
            CryptoJS.TripleDES.encrypt(plainKeyWS, pbkdf2KeyWS, { "iv": encryptionSchemeIVWS }) + "";

        //alert("encryptedKeyHex=" + encryptedKeyHex);

        var info = {};
        info.ciphertext = encryptedKeyHex;
        //alert("info.ciphertext=" + info.ciphertext);
        info.pbkdf2Salt = CryptoJS.enc.Hex.stringify(pbkdf2SaltWS);
        info.pbkdf2Iter = pbkdf2Iter;
        info.encryptionSchemeAlg = encryptionSchemeAlg;
        info.encryptionSchemeIV = CryptoJS.enc.Hex.stringify(encryptionSchemeIVWS);
        return info;
    };

    // x. PEM PKCS#8 plain private key of RSA private key object
    if (formatType == "PKCS8PRV" &&
        _RSAKey != undefined &&
        keyObjOrHex instanceof _RSAKey &&
        keyObjOrHex.isPrivate  == true) {

        var keyObj = _rsaprv2asn1obj(keyObjOrHex);
        var keyHex = keyObj.getEncodedHex();

        var asn1Obj = _newObject({
            "seq": [
                {"int": 0},
                {"seq": [{"oid": {"name": "rsaEncryption"}},{"null": true}]},
                {"octstr": {"hex": keyHex}}
            ]
        });
        var asn1Hex = asn1Obj.getEncodedHex();

        if (passwd === undefined || passwd == null) {
            return hextopem(asn1Hex, "PRIVATE KEY");
        } else {
            var asn1Hex2 = _getEncryptedPKCS8(asn1Hex, passwd);
            return hextopem(asn1Hex2, "ENCRYPTED PRIVATE KEY");
        }
    }

    // x. PEM PKCS#8 plain private key of ECDSA private key object
    if (formatType == "PKCS8PRV" &&
        _ECDSA !== undefined &&
        keyObjOrHex instanceof _ECDSA &&
        keyObjOrHex.isPrivate  == true) {

        var keyObj = new _newObject({
            "seq": [
                {"int": 1},
                {"octstr": {"hex": keyObjOrHex.prvKeyHex}},
                {"tag": ['a1', true, {"bitstr": {"hex": "00" + keyObjOrHex.pubKeyHex}}]}
            ]
        });
        var keyHex = keyObj.getEncodedHex();

        var asn1Obj = _newObject({
            "seq": [
                {"int": 0},
                {"seq": [
                    {"oid": {"name": "ecPublicKey"}},
                    {"oid": {"name": keyObjOrHex.curveName}}
                ]},
                {"octstr": {"hex": keyHex}}
            ]
        });

        var asn1Hex = asn1Obj.getEncodedHex();
        if (passwd === undefined || passwd == null) {
            return hextopem(asn1Hex, "PRIVATE KEY");
        } else {
            var asn1Hex2 = _getEncryptedPKCS8(asn1Hex, passwd);
            return hextopem(asn1Hex2, "ENCRYPTED PRIVATE KEY");
        }
    }

    // x. PEM PKCS#8 plain private key of DSA private key object
    if (formatType == "PKCS8PRV" &&
        _DSA !== undefined &&
        keyObjOrHex instanceof _DSA &&
        keyObjOrHex.isPrivate  == true) {

        var keyObj = new _DERInteger({'bigint': keyObjOrHex.x});
        var keyHex = keyObj.getEncodedHex();

        var asn1Obj = _newObject({
            "seq": [
                {"int": 0},
                {"seq": [
                    {"oid": {"name": "dsa"}},
                    {"seq": [
                        {"int": {"bigint": keyObjOrHex.p}},
                        {"int": {"bigint": keyObjOrHex.q}},
                        {"int": {"bigint": keyObjOrHex.g}}
                    ]}
                ]},
                {"octstr": {"hex": keyHex}}
            ]
        });

        var asn1Hex = asn1Obj.getEncodedHex();
        if (passwd === undefined || passwd == null) {
            return hextopem(asn1Hex, "PRIVATE KEY");
        } else {
            var asn1Hex2 = _getEncryptedPKCS8(asn1Hex, passwd);
            return hextopem(asn1Hex2, "ENCRYPTED PRIVATE KEY");
        }
    }

    throw "unsupported object nor format";
};

// -- PUBLIC METHODS FOR CSR --------------------------------------------------

/**
 * get RSAKey/DSA/ECDSA public key object from PEM formatted PKCS#10 CSR string
 * @name getKeyFromCSRPEM
 * @memberOf KEYUTIL
 * @function
 * @param {String} csrPEM PEM formatted PKCS#10 CSR string
 * @return {Object} RSAKey/DSA/ECDSA public key object
 * @since keyutil 1.0.5
 */
KEYUTIL.getKeyFromCSRPEM = function(csrPEM) {
    var csrHex = pemtohex(csrPEM, "CERTIFICATE REQUEST");
    var key = KEYUTIL.getKeyFromCSRHex(csrHex);
    return key;
};

/**
 * get RSAKey/DSA/ECDSA public key object from hexadecimal string of PKCS#10 CSR
 * @name getKeyFromCSRHex
 * @memberOf KEYUTIL
 * @function
 * @param {String} csrHex hexadecimal string of PKCS#10 CSR
 * @return {Object} RSAKey/DSA/ECDSA public key object
 * @since keyutil 1.0.5
 */
KEYUTIL.getKeyFromCSRHex = function(csrHex) {
    var info = KEYUTIL.parseCSRHex(csrHex);
    var key = KEYUTIL.getKey(info.p8pubkeyhex, null, "pkcs8pub");
    return key;
};

/**
 * parse hexadecimal string of PKCS#10 CSR (certificate signing request)
 * @name parseCSRHex
 * @memberOf KEYUTIL
 * @function
 * @param {String} csrHex hexadecimal string of PKCS#10 CSR
 * @return {Array} associative array of parsed CSR
 * @since keyutil 1.0.5
 * @description
 * Resulted associative array has following properties:
 * <ul>
 * <li>p8pubkeyhex - hexadecimal string of subject public key in PKCS#8</li>
 * </ul>
 */
KEYUTIL.parseCSRHex = function(csrHex) {
    var _ASN1HEX = ASN1HEX;
    var _getChildIdx = _ASN1HEX.getChildIdx;
    var _getTLV = _ASN1HEX.getTLV;
    var result = {};
    var h = csrHex;

    // 1. sequence
    if (h.substr(0, 2) != "30")
        throw "malformed CSR(code:001)"; // not sequence

    var a1 = _getChildIdx(h, 0);
    if (a1.length < 1)
        throw "malformed CSR(code:002)"; // short length

    // 2. 2nd sequence
    if (h.substr(a1[0], 2) != "30")
        throw "malformed CSR(code:003)"; // not sequence

    var a2 = _getChildIdx(h, a1[0]);
    if (a2.length < 3)
        throw "malformed CSR(code:004)"; // 2nd seq short elem

    result.p8pubkeyhex = _getTLV(h, a2[2]);

    return result;
};

// -- OTHER STATIC PUBLIC METHODS  -------------------------------------------------

/**
 * convert from RSAKey/KJUR.crypto.ECDSA public/private key object to RFC 7517 JSON Web Key(JWK)
 * @name getJWKFromKey
 * @memberOf KEYUTIL
 * @function
 * @static
 * @param {Object} RSAKey/KJUR.crypto.ECDSA public/private key object
 * @return {Object} JWK object
 * @since keyutil 1.0.13 jsrsasign 5.0.14
 * @description
 * This static method convert from RSAKey/KJUR.crypto.ECDSA public/private key object 
 * to RFC 7517 JSON Web Key(JWK)
 * @example
 * kp1 = KEYUTIL.generateKeypair("EC", "P-256");
 * jwkPrv1 = KEYUTIL.getJWKFromKey(kp1.prvKeyObj);
 * jwkPub1 = KEYUTIL.getJWKFromKey(kp1.pubKeyObj);
 *
 * kp2 = KEYUTIL.generateKeypair("RSA", 2048);
 * jwkPrv2 = KEYUTIL.getJWKFromKey(kp2.prvKeyObj);
 * jwkPub2 = KEYUTIL.getJWKFromKey(kp2.pubKeyObj);
 *
 * // if you need RFC 7638 JWK thumprint as kid do like this:
 * jwkPub2.kid = KJUR.jws.JWS.getJWKthumbprint(jwkPub2);
 */
KEYUTIL.getJWKFromKey = function(keyObj) {
    var jwk = {};
    if (keyObj instanceof RSAKey && keyObj.isPrivate) {
	jwk.kty = "RSA";
	jwk.n = hextob64u(keyObj.n.toString(16));
	jwk.e = hextob64u(keyObj.e.toString(16));
	jwk.d = hextob64u(keyObj.d.toString(16));
	jwk.p = hextob64u(keyObj.p.toString(16));
	jwk.q = hextob64u(keyObj.q.toString(16));
	jwk.dp = hextob64u(keyObj.dmp1.toString(16));
	jwk.dq = hextob64u(keyObj.dmq1.toString(16));
	jwk.qi = hextob64u(keyObj.coeff.toString(16));
	return jwk;
    } else if (keyObj instanceof RSAKey && keyObj.isPublic) {
	jwk.kty = "RSA";
	jwk.n = hextob64u(keyObj.n.toString(16));
	jwk.e = hextob64u(keyObj.e.toString(16));
	return jwk;
    } else if (keyObj instanceof KJUR.crypto.ECDSA && keyObj.isPrivate) {
	var name = keyObj.getShortNISTPCurveName();
	if (name !== "P-256" && name !== "P-384")
	    throw "unsupported curve name for JWT: " + name;
	var xy = keyObj.getPublicKeyXYHex();
	jwk.kty = "EC";
	jwk.crv =  name;
	jwk.x = hextob64u(xy.x);
	jwk.y = hextob64u(xy.y);
	jwk.d = hextob64u(keyObj.prvKeyHex);
	return jwk;
    } else if (keyObj instanceof KJUR.crypto.ECDSA && keyObj.isPublic) {
	var name = keyObj.getShortNISTPCurveName();
	if (name !== "P-256" && name !== "P-384")
	    throw "unsupported curve name for JWT: " + name;
	var xy = keyObj.getPublicKeyXYHex();
	jwk.kty = "EC";
	jwk.crv =  name;
	jwk.x = hextob64u(xy.x);
	jwk.y = hextob64u(xy.y);
	return jwk;
    }
    throw "not supported key object";
};


/* rsapem-1.3.0.js (c) 2012-2017 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * rsapem.js - Cryptographic Algorithm Provider class
 *
 * Copyright (c) 2013-2017 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name rsapem-1.1.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version jsrsasign 8.0.0 rsapem 1.3.0 (2017-Jun-24)
 * @since jsrsasign 1.0
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

/**
 * static method to get array of field positions from hexadecimal PKCS#5 RSA private key.<br/>
 * @name getPosArrayOfChildrenFromHex
 * @memberOf RSAKey
 * @function
 * @param {String} sPEMPrivateKey PEM PKCS#1/5 s private key string
 * @return {Array} array of field positions
 * @example
 * RSAKey.getPosArrayOfChildrenFromHex("3082...") &rarr; [8, 32, ...]
 */
RSAKey.getPosArrayOfChildrenFromHex = function(hPrivateKey) {
    return ASN1HEX.getChildIdx(hPrivateKey, 0);
};

/**
 * static method to get array of hex field values from hexadecimal PKCS#5 RSA private key.<br/>
 * @name getHexValueArrayOfChildrenFromHex
 * @memberOf RSAKey
 * @function
 * @param {String} sPEMPrivateKey PEM PKCS#1/5 s private key string
 * @return {Array} array of field hex value
 * @example
 * RSAKey.getHexValueArrayOfChildrenFromHex("3082...") &rarr; ["00", "3b42...", ...]
 */
RSAKey.getHexValueArrayOfChildrenFromHex = function(hPrivateKey) {
    var _ASN1HEX = ASN1HEX;
    var _getV = _ASN1HEX.getV;
    var a = RSAKey.getPosArrayOfChildrenFromHex(hPrivateKey);
    var h_v =  _getV(hPrivateKey, a[0]);
    var h_n =  _getV(hPrivateKey, a[1]);
    var h_e =  _getV(hPrivateKey, a[2]);
    var h_d =  _getV(hPrivateKey, a[3]);
    var h_p =  _getV(hPrivateKey, a[4]);
    var h_q =  _getV(hPrivateKey, a[5]);
    var h_dp = _getV(hPrivateKey, a[6]);
    var h_dq = _getV(hPrivateKey, a[7]);
    var h_co = _getV(hPrivateKey, a[8]);
    var a = new Array();
    a.push(h_v, h_n, h_e, h_d, h_p, h_q, h_dp, h_dq, h_co);
    return a;
};

/**
 * read PKCS#1 private key from a string<br/>
 * @name readPrivateKeyFromPEMString
 * @memberOf RSAKey#
 * @function
 * @param {String} keyPEM string of PKCS#1 private key.
 */
RSAKey.prototype.readPrivateKeyFromPEMString = function(keyPEM) {
    var keyHex = pemtohex(keyPEM);
    var a = RSAKey.getHexValueArrayOfChildrenFromHex(keyHex);
    this.setPrivateEx(a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8]);
};

/**
 * read an ASN.1 hexadecimal string of PKCS#1/5 plain RSA private key<br/>
 * @name readPKCS5PrvKeyHex
 * @memberOf RSAKey#
 * @function
 * @param {String} h hexadecimal string of PKCS#1/5 plain RSA private key
 * @since jsrsasign 7.1.0 rsapem 1.2.0
 * @see {@link RSAKey.readPrivateKeyFromASN1HexString} former method
 */
RSAKey.prototype.readPKCS5PrvKeyHex = function(h) {
    var a = RSAKey.getHexValueArrayOfChildrenFromHex(h);
    this.setPrivateEx(a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8]);
};

/**
 * read an ASN.1 hexadecimal string of PKCS#8 plain RSA private key<br/>
 * @name readPKCS8PrvKeyHex
 * @memberOf RSAKey#
 * @function
 * @param {String} h hexadecimal string of PKCS#8 plain RSA private key
 * @since jsrsasign 7.1.0 rsapem 1.2.0
 */
RSAKey.prototype.readPKCS8PrvKeyHex = function(h) {
    var hN, hE, hD, hP, hQ, hDP, hDQ, hCO;
    var _ASN1HEX = ASN1HEX;
    var _getVbyList = _ASN1HEX.getVbyList;

    if (_ASN1HEX.isASN1HEX(h) === false)
	throw "not ASN.1 hex string";

    try {
	hN  = _getVbyList(h, 0, [2, 0, 1], "02");
	hE  = _getVbyList(h, 0, [2, 0, 2], "02");
	hD  = _getVbyList(h, 0, [2, 0, 3], "02");
	hP  = _getVbyList(h, 0, [2, 0, 4], "02");
	hQ  = _getVbyList(h, 0, [2, 0, 5], "02");
	hDP = _getVbyList(h, 0, [2, 0, 6], "02");
	hDQ = _getVbyList(h, 0, [2, 0, 7], "02");
	hCO = _getVbyList(h, 0, [2, 0, 8], "02");
    } catch(ex) {
	throw "malformed PKCS#8 plain RSA private key";
    }

    this.setPrivateEx(hN, hE, hD, hP, hQ, hDP, hDQ, hCO);
};

/**
 * read an ASN.1 hexadecimal string of PKCS#5 RSA public key<br/>
 * @name readPKCS5PubKeyHex
 * @memberOf RSAKey#
 * @function
 * @param {String} h hexadecimal string of PKCS#5 public key
 * @since jsrsasign 7.1.0 rsapem 1.2.0
 */
RSAKey.prototype.readPKCS5PubKeyHex = function(h) {
    var _ASN1HEX = ASN1HEX;
    var _getV = _ASN1HEX.getV;

    if (_ASN1HEX.isASN1HEX(h) === false)
	throw "keyHex is not ASN.1 hex string";
    var aIdx = _ASN1HEX.getChildIdx(h, 0);
    if (aIdx.length !== 2 ||
	h.substr(aIdx[0], 2) !== "02" ||
	h.substr(aIdx[1], 2) !== "02")
	throw "wrong hex for PKCS#5 public key";
    var hN = _getV(h, aIdx[0]);
    var hE = _getV(h, aIdx[1]);
    this.setPublic(hN, hE);
};

/**
 * read an ASN.1 hexadecimal string of PKCS#8 RSA public key<br/>
 * @name readPKCS8PubKeyHex
 * @memberOf RSAKey#
 * @function
 * @param {String} h hexadecimal string of PKCS#8 public key
 * @since jsrsasign 7.1.0 rsapem 1.2.0
 */
RSAKey.prototype.readPKCS8PubKeyHex = function(h) {
    var _ASN1HEX = ASN1HEX;
    if (_ASN1HEX.isASN1HEX(h) === false)
	throw "not ASN.1 hex string";

    // 06092a864886f70d010101: OBJECT IDENTIFIER rsaEncryption (1 2 840 113549 1 1 1)
    if (_ASN1HEX.getTLVbyList(h, 0, [0, 0]) !== "06092a864886f70d010101")
	throw "not PKCS8 RSA public key";

    var p5hex = _ASN1HEX.getTLVbyList(h, 0, [1, 0]);
    this.readPKCS5PubKeyHex(p5hex);
};

/**
 * read an ASN.1 hexadecimal string of X.509 RSA public key certificate<br/>
 * @name readCertPubKeyHex
 * @memberOf RSAKey#
 * @function
 * @param {String} h hexadecimal string of X.509 RSA public key certificate
 * @param {Integer} nthPKI nth index of publicKeyInfo. (DEFAULT: 6 for X509v3)
 * @since jsrsasign 7.1.0 rsapem 1.2.0
 */
RSAKey.prototype.readCertPubKeyHex = function(h, nthPKI) {
    var x, hPub;
    x = new X509();
    x.readCertHex(h);
    hPub = x.getPublicKeyHex();
    this.readPKCS8PubKeyHex(hPub);
};
/* rsasign-1.3.0.js (c) 2010-2017 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * rsa-sign.js - adding signing functions to RSAKey class.
 *
 * Copyright (c) 2010-2017 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license/
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name rsasign-1.2.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version jsrsasign 8.0.0 rsasign 1.3.0 (2017-Jun-28)
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

var _RE_HEXDECONLY = new RegExp("");
_RE_HEXDECONLY.compile("[^0-9a-f]", "gi");

// ========================================================================
// Signature Generation
// ========================================================================

function _rsasign_getHexPaddedDigestInfoForString(s, keySize, hashAlg) {
    var hashFunc = function(s) { return KJUR.crypto.Util.hashString(s, hashAlg); };
    var sHashHex = hashFunc(s);

    return KJUR.crypto.Util.getPaddedDigestInfoHex(sHashHex, hashAlg, keySize);
}

function _zeroPaddingOfSignature(hex, bitLength) {
    var s = "";
    var nZero = bitLength / 4 - hex.length;
    for (var i = 0; i < nZero; i++) {
	s = s + "0";
    }
    return s + hex;
}

/**
 * sign for a message string with RSA private key.<br/>
 * @name sign
 * @memberOf RSAKey
 * @function
 * @param {String} s message string to be signed.
 * @param {String} hashAlg hash algorithm name for signing.<br/>
 * @return returns hexadecimal string of signature value.
 */
RSAKey.prototype.sign = function(s, hashAlg) {
    var hashFunc = function(s) { return KJUR.crypto.Util.hashString(s, hashAlg); };
    var sHashHex = hashFunc(s);

    return this.signWithMessageHash(sHashHex, hashAlg);
};

/**
 * sign hash value of message to be signed with RSA private key.<br/>
 * @name signWithMessageHash
 * @memberOf RSAKey
 * @function
 * @param {String} sHashHex hexadecimal string of hash value of message to be signed.
 * @param {String} hashAlg hash algorithm name for signing.<br/>
 * @return returns hexadecimal string of signature value.
 * @since rsasign 1.2.6
 */
RSAKey.prototype.signWithMessageHash = function(sHashHex, hashAlg) {
    var hPM = KJUR.crypto.Util.getPaddedDigestInfoHex(sHashHex, hashAlg, this.n.bitLength());
    var biPaddedMessage = parseBigInt(hPM, 16);
    var biSign = this.doPrivate(biPaddedMessage);
    var hexSign = biSign.toString(16);
    return _zeroPaddingOfSignature(hexSign, this.n.bitLength());
}

// PKCS#1 (PSS) mask generation function
function pss_mgf1_str(seed, len, hash) {
    var mask = '', i = 0;

    while (mask.length < len) {
        mask += hextorstr(hash(rstrtohex(seed + String.fromCharCode.apply(String, [
                (i & 0xff000000) >> 24,
                (i & 0x00ff0000) >> 16,
                (i & 0x0000ff00) >> 8,
                i & 0x000000ff]))));
        i += 1;
    }

    return mask;
}

/**
 * sign for a message string with RSA private key by PKCS#1 PSS signing.<br/>
 * @name signPSS
 * @memberOf RSAKey
 * @function
 * @param {String} s message string to be signed.
 * @param {String} hashAlg hash algorithm name for signing.
 * @param {Integer} sLen salt byte length from 0 to (keybytelen - hashbytelen - 2).
 *        There are two special values:
 *        <ul>
 *        <li>-1: sets the salt length to the digest length</li>
 *        <li>-2: sets the salt length to maximum permissible value
 *           (i.e. keybytelen - hashbytelen - 2)</li>
 *        </ul>
 *        DEFAULT is -1. (NOTE: OpenSSL's default is -2.)
 * @return returns hexadecimal string of signature value.
 */
RSAKey.prototype.signPSS = function(s, hashAlg, sLen) {
    var hashFunc = function(sHex) { return KJUR.crypto.Util.hashHex(sHex, hashAlg); } 
    var hHash = hashFunc(rstrtohex(s));

    if (sLen === undefined) sLen = -1;
    return this.signWithMessageHashPSS(hHash, hashAlg, sLen);
};

/**
 * sign hash value of message with RSA private key by PKCS#1 PSS signing.<br/>
 * @name signWithMessageHashPSS
 * @memberOf RSAKey
 * @function
 * @param {String} hHash hexadecimal hash value of message to be signed.
 * @param {String} hashAlg hash algorithm name for signing.
 * @param {Integer} sLen salt byte length from 0 to (keybytelen - hashbytelen - 2).
 *        There are two special values:
 *        <ul>
 *        <li>-1: sets the salt length to the digest length</li>
 *        <li>-2: sets the salt length to maximum permissible value
 *           (i.e. keybytelen - hashbytelen - 2)</li>
 *        </ul>
 *        DEFAULT is -1. (NOTE: OpenSSL's default is -2.)
 * @return returns hexadecimal string of signature value.
 * @since rsasign 1.2.6
 */
RSAKey.prototype.signWithMessageHashPSS = function(hHash, hashAlg, sLen) {
    var mHash = hextorstr(hHash);
    var hLen = mHash.length;
    var emBits = this.n.bitLength() - 1;
    var emLen = Math.ceil(emBits / 8);
    var i;
    var hashFunc = function(sHex) { return KJUR.crypto.Util.hashHex(sHex, hashAlg); } 

    if (sLen === -1 || sLen === undefined) {
        sLen = hLen; // same as hash length
    } else if (sLen === -2) {
        sLen = emLen - hLen - 2; // maximum
    } else if (sLen < -2) {
        throw "invalid salt length";
    }

    if (emLen < (hLen + sLen + 2)) {
        throw "data too long";
    }

    var salt = '';

    if (sLen > 0) {
        salt = new Array(sLen);
        new SecureRandom().nextBytes(salt);
        salt = String.fromCharCode.apply(String, salt);
    }

    var H = hextorstr(hashFunc(rstrtohex('\x00\x00\x00\x00\x00\x00\x00\x00' + mHash + salt)));
    var PS = [];

    for (i = 0; i < emLen - sLen - hLen - 2; i += 1) {
        PS[i] = 0x00;
    }

    var DB = String.fromCharCode.apply(String, PS) + '\x01' + salt;
    var dbMask = pss_mgf1_str(H, DB.length, hashFunc);
    var maskedDB = [];

    for (i = 0; i < DB.length; i += 1) {
        maskedDB[i] = DB.charCodeAt(i) ^ dbMask.charCodeAt(i);
    }

    var mask = (0xff00 >> (8 * emLen - emBits)) & 0xff;
    maskedDB[0] &= ~mask;

    for (i = 0; i < hLen; i++) {
        maskedDB.push(H.charCodeAt(i));
    }

    maskedDB.push(0xbc);

    return _zeroPaddingOfSignature(this.doPrivate(new BigInteger(maskedDB)).toString(16),
				   this.n.bitLength());
}

// ========================================================================
// Signature Verification
// ========================================================================

function _rsasign_getDecryptSignatureBI(biSig, hN, hE) {
    var rsa = new RSAKey();
    rsa.setPublic(hN, hE);
    var biDecryptedSig = rsa.doPublic(biSig);
    return biDecryptedSig;
}

function _rsasign_getHexDigestInfoFromSig(biSig, hN, hE) {
    var biDecryptedSig = _rsasign_getDecryptSignatureBI(biSig, hN, hE);
    var hDigestInfo = biDecryptedSig.toString(16).replace(/^1f+00/, '');
    return hDigestInfo;
}

function _rsasign_getAlgNameAndHashFromHexDisgestInfo(hDigestInfo) {
    for (var algName in KJUR.crypto.Util.DIGESTINFOHEAD) {
	var head = KJUR.crypto.Util.DIGESTINFOHEAD[algName];
	var len = head.length;
	if (hDigestInfo.substring(0, len) == head) {
	    var a = [algName, hDigestInfo.substring(len)];
	    return a;
	}
    }
    return [];
}

/**
 * verifies a sigature for a message string with RSA public key.<br/>
 * @name verify
 * @memberOf RSAKey#
 * @function
 * @param {String} sMsg message string to be verified.
 * @param {String} hSig hexadecimal string of siganture.<br/>
 *                 non-hexadecimal charactors including new lines will be ignored.
 * @return returns 1 if valid, otherwise 0
 */
RSAKey.prototype.verify = function(sMsg, hSig) {
    hSig = hSig.replace(_RE_HEXDECONLY, '');
    hSig = hSig.replace(/[ \n]+/g, "");
    var biSig = parseBigInt(hSig, 16);
    if (biSig.bitLength() > this.n.bitLength()) return 0;
    var biDecryptedSig = this.doPublic(biSig);
    var hDigestInfo = biDecryptedSig.toString(16).replace(/^1f+00/, '');
    var digestInfoAry = _rsasign_getAlgNameAndHashFromHexDisgestInfo(hDigestInfo);
  
    if (digestInfoAry.length == 0) return false;
    var algName = digestInfoAry[0];
    var diHashValue = digestInfoAry[1];
    var ff = function(s) { return KJUR.crypto.Util.hashString(s, algName); };
    var msgHashValue = ff(sMsg);
    return (diHashValue == msgHashValue);
};

/**
 * verifies a sigature for a message string with RSA public key.<br/>
 * @name verifyWithMessageHash
 * @memberOf RSAKey
 * @function
 * @param {String} sHashHex hexadecimal hash value of message to be verified.
 * @param {String} hSig hexadecimal string of siganture.<br/>
 *                 non-hexadecimal charactors including new lines will be ignored.
 * @return returns 1 if valid, otherwise 0
 * @since rsasign 1.2.6
 */
RSAKey.prototype.verifyWithMessageHash = function(sHashHex, hSig) {
    hSig = hSig.replace(_RE_HEXDECONLY, '');
    hSig = hSig.replace(/[ \n]+/g, "");
    var biSig = parseBigInt(hSig, 16);
    if (biSig.bitLength() > this.n.bitLength()) return 0;
    var biDecryptedSig = this.doPublic(biSig);
    var hDigestInfo = biDecryptedSig.toString(16).replace(/^1f+00/, '');
    var digestInfoAry = _rsasign_getAlgNameAndHashFromHexDisgestInfo(hDigestInfo);
  
    if (digestInfoAry.length == 0) return false;
    var algName = digestInfoAry[0];
    var diHashValue = digestInfoAry[1];
    return (diHashValue == sHashHex);
};

/**
 * verifies a sigature for a message string with RSA public key by PKCS#1 PSS sign.<br/>
 * @name verifyPSS
 * @memberOf RSAKey
 * @function
 * @param {String} sMsg message string to be verified.
 * @param {String} hSig hexadecimal string of signature value
 * @param {String} hashAlg hash algorithm name
 * @param {Integer} sLen salt byte length from 0 to (keybytelen - hashbytelen - 2).
 *        There are two special values:
 *        <ul>
 *        <li>-1: sets the salt length to the digest length</li>
 *        <li>-2: sets the salt length to maximum permissible value
 *           (i.e. keybytelen - hashbytelen - 2)</li>
 *        </ul>
 *        DEFAULT is -1. (NOTE: OpenSSL's default is -2.)
 * @return returns true if valid, otherwise false
 */
RSAKey.prototype.verifyPSS = function(sMsg, hSig, hashAlg, sLen) {
    var hashFunc = function(sHex) { return KJUR.crypto.Util.hashHex(sHex, hashAlg); };
    var hHash = hashFunc(rstrtohex(sMsg));

    if (sLen === undefined) sLen = -1;
    return this.verifyWithMessageHashPSS(hHash, hSig, hashAlg, sLen);
}

/**
 * verifies a sigature for a hash value of message string with RSA public key by PKCS#1 PSS sign.<br/>
 * @name verifyWithMessageHashPSS
 * @memberOf RSAKey
 * @function
 * @param {String} hHash hexadecimal hash value of message string to be verified.
 * @param {String} hSig hexadecimal string of signature value
 * @param {String} hashAlg hash algorithm name
 * @param {Integer} sLen salt byte length from 0 to (keybytelen - hashbytelen - 2).
 *        There are two special values:
 *        <ul>
 *        <li>-1: sets the salt length to the digest length</li>
 *        <li>-2: sets the salt length to maximum permissible value
 *           (i.e. keybytelen - hashbytelen - 2)</li>
 *        </ul>
 *        DEFAULT is -1 (NOTE: OpenSSL's default is -2.)
 * @return returns true if valid, otherwise false
 * @since rsasign 1.2.6
 */
RSAKey.prototype.verifyWithMessageHashPSS = function(hHash, hSig, hashAlg, sLen) {
    var biSig = new BigInteger(hSig, 16);

    if (biSig.bitLength() > this.n.bitLength()) {
        return false;
    }

    var hashFunc = function(sHex) { return KJUR.crypto.Util.hashHex(sHex, hashAlg); };
    var mHash = hextorstr(hHash);
    var hLen = mHash.length;
    var emBits = this.n.bitLength() - 1;
    var emLen = Math.ceil(emBits / 8);
    var i;

    if (sLen === -1 || sLen === undefined) {
        sLen = hLen; // same as hash length
    } else if (sLen === -2) {
        sLen = emLen - hLen - 2; // recover
    } else if (sLen < -2) {
        throw "invalid salt length";
    }

    if (emLen < (hLen + sLen + 2)) {
        throw "data too long";
    }

    var em = this.doPublic(biSig).toByteArray();

    for (i = 0; i < em.length; i += 1) {
        em[i] &= 0xff;
    }

    while (em.length < emLen) {
        em.unshift(0);
    }

    if (em[emLen -1] !== 0xbc) {
        throw "encoded message does not end in 0xbc";
    }

    em = String.fromCharCode.apply(String, em);

    var maskedDB = em.substr(0, emLen - hLen - 1);
    var H = em.substr(maskedDB.length, hLen);

    var mask = (0xff00 >> (8 * emLen - emBits)) & 0xff;

    if ((maskedDB.charCodeAt(0) & mask) !== 0) {
        throw "bits beyond keysize not zero";
    }

    var dbMask = pss_mgf1_str(H, maskedDB.length, hashFunc);
    var DB = [];

    for (i = 0; i < maskedDB.length; i += 1) {
        DB[i] = maskedDB.charCodeAt(i) ^ dbMask.charCodeAt(i);
    }

    DB[0] &= ~mask;

    var checkLen = emLen - hLen - sLen - 2;

    for (i = 0; i < checkLen; i += 1) {
        if (DB[i] !== 0x00) {
            throw "leftmost octets not zero";
        }
    }

    if (DB[checkLen] !== 0x01) {
        throw "0x01 marker not found";
    }

    return H === hextorstr(hashFunc(rstrtohex('\x00\x00\x00\x00\x00\x00\x00\x00' + mHash +
				     String.fromCharCode.apply(String, DB.slice(-sLen)))));
}

RSAKey.SALT_LEN_HLEN = -1;
RSAKey.SALT_LEN_MAX = -2;
RSAKey.SALT_LEN_RECOVER = -2;

/**
 * @name RSAKey
 * @class key of RSA public key algorithm
 * @description Tom Wu's RSA Key class and extension
 */
/* x509-1.1.20.js (c) 2012-2018 Kenji Urushima | kjur.github.io/jsrsasign/license
 */
/*
 * x509.js - X509 class to read subject public key from certificate.
 *
 * Copyright (c) 2010-2018 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license
 *
 * The above copyright and license notice shall be
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name x509-1.1.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version jsrsasign 8.0.10 x509 1.1.20 (2018-Apr-09)
 * @since jsrsasign 1.x.x
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

/**
 * hexadecimal X.509 certificate ASN.1 parser class.<br/>
 * @class hexadecimal X.509 certificate ASN.1 parser class
 * @property {String} hex hexacedimal string for X.509 certificate.
 * @property {Number} version format version (1: X509v1, 3: X509v3, otherwise: unknown) since jsrsasign 7.1.4
 * @author Kenji Urushima
 * @version 1.0.1 (08 May 2012)
 * @see <a href="https://kjur.github.io/jsrsasigns/">'jsrsasign'(RSA Sign JavaScript Library) home page https://kjur.github.io/jsrsasign/</a>
 * @description
 * X509 class provides following functionality:
 * <ul>
 * <li>parse X.509 certificate ASN.1 structure</li>
 * <li>get basic fields, extensions, signature algorithms and signature values</li>
 * <li>read PEM certificate</li>
 * </ul>
 *
 * <ul>
 * <li><b>TO GET FIELDS</b>
 *   <ul>
 *   <li>serial - {@link X509#getSerialNumberHex}</li>
 *   <li>signature algorithm field - {@link X509#getSignatureAlgorithmField}</li>
 *   <li>issuer - {@link X509#getIssuerHex}</li>
 *   <li>issuer - {@link X509#getIssuerString}</li>
 *   <li>notBefore - {@link X509#getNotBefore}</li>
 *   <li>notAfter - {@link X509#getNotAfter}</li>
 *   <li>subject - {@link X509#getSubjectHex}</li>
 *   <li>subject - {@link X509#getSubjectString}</li>
 *   <li>subjectPublicKeyInfo - {@link X509#getPublicKey}</li>
 *   <li>subjectPublicKeyInfo - {@link X509#getPublicKeyHex}</li>
 *   <li>subjectPublicKeyInfo - {@link X509#getPublicKeyIdx}</li>
 *   <li>subjectPublicKeyInfo - {@link X509.getPublicKeyFromCertPEM}</li>
 *   <li>subjectPublicKeyInfo - {@link X509.getPublicKeyFromCertHex}</li>
 *   <li>subjectPublicKeyInfo - {@link X509#getPublicKeyContentIdx}</li>
 *   <li>signature algorithm - {@link X509#getSignatureAlgorithmName}</li>
 *   <li>signature value - {@link X509#getSignatureValueHex}</li>
 *   </ul>
 * </li>
 * <li><b>X509 METHODS TO GET EXTENSIONS</b>
 *   <ul>
 *   <li>basicConstraints - {@link X509#getExtBasicConstraints}</li>
 *   <li>keyUsage - {@link X509#getExtKeyUsageBin}</li>
 *   <li>keyUsage - {@link X509#getExtKeyUsageString}</li>
 *   <li>subjectKeyIdentifier - {@link X509#getExtSubjectKeyIdentifier}</li>
 *   <li>authorityKeyIdentifier - {@link X509#getExtAuthorityKeyIdentifier}</li>
 *   <li>extKeyUsage - {@link X509#getExtExtKeyUsageName}</li>
 *   <li>subjectAltName(DEPRECATED) - {@link X509#getExtSubjectAltName}</li>
 *   <li>subjectAltName2 - {@link X509#getExtSubjectAltName2}</li>
 *   <li>cRLDistributionPoints - {@link X509#getExtCRLDistributionPointsURI}</li>
 *   <li>authorityInfoAccess - {@link X509#getExtAIAInfo}</li>
 *   <li>certificatePolicies - {@link X509#getExtCertificatePolicies}</li>
 *   </ul>
 * </li>
 * <li><b>UTILITIES</b>
 *   <ul>
 *   <li>reading PEM X.509 certificate - {@link X509#readCertPEM}</li>
 *   <li>reading hexadecimal string of X.509 certificate - {@link X509#readCertHex}</li>
 *   <li>get all certificate information - {@link X509#getInfo}</li>
 *   <li>get specified extension information - {@link X509#getExtInfo}</li>
 *   <li>verify signature value - {@link X509#verifySignature}</li>
 *   </ul>
 * </li>
 * </ul>
 */
function X509() {
    var _ASN1HEX = ASN1HEX,
	_getChildIdx = _ASN1HEX.getChildIdx,
	_getV = _ASN1HEX.getV,
	_getTLV = _ASN1HEX.getTLV,
	_getVbyList = _ASN1HEX.getVbyList,
	_getTLVbyList = _ASN1HEX.getTLVbyList,
	_getIdxbyList = _ASN1HEX.getIdxbyList,
	_getVidx = _ASN1HEX.getVidx,
	_oidname = _ASN1HEX.oidname,
	_X509 = X509,
	_pemtohex = pemtohex;

    this.hex = null;
    this.version = 0; // version (1: X509v1, 3: X509v3, others: unspecified)
    this.foffset = 0; // field index offset (-1: for X509v1, 0: for X509v3)
    this.aExtInfo = null;

    // ===== get basic fields from hex =====================================

    /**
     * get format version (X.509v1 or v3 certificate)<br/>
     * @name getVersion
     * @memberOf X509#
     * @function
     * @return {Number} 1 for X509v1, 3 for X509v3, otherwise 0
     * @since jsrsasign 7.1.14 x509 1.1.13
     * @description
     * This method returns a format version of X.509 certificate.
     * It returns 1 for X.509v1 certificate and 3 for v3 certificate.
     * Otherwise returns 0.
     * This method will be automatically called in
     * {@link X509#readCertPEM}. After then, you can use
     * {@link X509.version} parameter.
     * @example
     * var x = new X509();
     * x.readCertPEM(sCertPEM);
     * version = x.getVersion();    // 1 or 3
     * sn = x.getSerialNumberHex(); // return string like "01ad..."
     */
    this.getVersion = function() {
	if (this.hex === null || this.version !== 0) return this.version;

	// check if the first item of tbsCertificate "[0] { INTEGER 2 }"
	if (_getTLVbyList(this.hex, 0, [0, 0]) !==
	    "a003020102") {
	    this.version = 1;
	    this.foffset = -1;
	    return 1;
	}

	this.version = 3;
	return 3;
    };

    /**
     * get hexadecimal string of serialNumber field of certificate.<br/>
     * @name getSerialNumberHex
     * @memberOf X509#
     * @function
     * @return {String} hexadecimal string of certificate serial number
     * @example
     * var x = new X509();
     * x.readCertPEM(sCertPEM);
     * var sn = x.getSerialNumberHex(); // return string like "01ad..."
     */
    this.getSerialNumberHex = function() {
	return _getVbyList(this.hex, 0, [0, 1 + this.foffset], "02");
    };

    /**
     * get signature algorithm name in basic field
     * @name getSignatureAlgorithmField
     * @memberOf X509#
     * @function
     * @return {String} signature algorithm name (ex. SHA1withRSA, SHA256withECDSA)
     * @since x509 1.1.8
     * @description
     * This method will get a name of signature algorithm field of certificate:
     * @example
     * var x = new X509();
     * x.readCertPEM(sCertPEM);
     * algName = x.getSignatureAlgorithmField();
     */
    this.getSignatureAlgorithmField = function() {
	return _oidname(_getVbyList(this.hex, 0, [0, 2 + this.foffset, 0], "06"));
    };

    /**
     * get hexadecimal string of issuer field TLV of certificate.<br/>
     * @name getIssuerHex
     * @memberOf X509#
     * @function
     * @return {String} hexadecial string of issuer DN ASN.1
     * @example
     * var x = new X509();
     * x.readCertPEM(sCertPEM);
     * var issuer = x.getIssuerHex(); // return string like "3013..."
     */
    this.getIssuerHex = function() {
	return _getTLVbyList(this.hex, 0, [0, 3 + this.foffset], "30");
    };

    /**
     * get string of issuer field of certificate.<br/>
     * @name getIssuerString
     * @memberOf X509#
     * @function
     * @return {String} issuer DN string
     * @example
     * var x = new X509();
     * x.readCertPEM(sCertPEM);
     * var issuer = x.getIssuerString(); // return string like "/C=US/O=TEST"
     */
    this.getIssuerString = function() {
        return _X509.hex2dn(this.getIssuerHex());
    };

    /**
     * get hexadecimal string of subject field of certificate.<br/>
     * @name getSubjectHex
     * @memberOf X509#
     * @function
     * @return {String} hexadecial string of subject DN ASN.1
     * @example
     * var x = new X509();
     * x.readCertPEM(sCertPEM);
     * var subject = x.getSubjectHex(); // return string like "3013..."
     */
    this.getSubjectHex = function() {
	return _getTLVbyList(this.hex, 0, [0, 5 + this.foffset], "30");
    };

    /**
     * get string of subject field of certificate.<br/>
     * @name getSubjectString
     * @memberOf X509#
     * @function
     * @return {String} subject DN string
     * @example
     * var x = new X509();
     * x.readCertPEM(sCertPEM);
     * var subject = x.getSubjectString(); // return string like "/C=US/O=TEST"
     */
    this.getSubjectString = function() {
        return _X509.hex2dn(this.getSubjectHex());
    };

    /**
     * get notBefore field string of certificate.<br/>
     * @name getNotBefore
     * @memberOf X509#
     * @function
     * @return {String} not before time value (ex. "151231235959Z")
     * @example
     * var x = new X509();
     * x.readCertPEM(sCertPEM);
     * var notBefore = x.getNotBefore(); // return string like "151231235959Z"
     */
    this.getNotBefore = function() {
        var s = _getVbyList(this.hex, 0, [0, 4 + this.foffset, 0]);
        s = s.replace(/(..)/g, "%$1");
        s = decodeURIComponent(s);
        return s;
    };

    /**
     * get notAfter field string of certificate.<br/>
     * @name getNotAfter
     * @memberOf X509#
     * @function
     * @return {String} not after time value (ex. "151231235959Z")
     * @example
     * var x = new X509();
     * x.readCertPEM(sCertPEM);
     * var notAfter = x.getNotAfter(); // return string like "151231235959Z"
     */
    this.getNotAfter = function() {
	var s = _getVbyList(this.hex, 0, [0, 4 + this.foffset, 1]);
        s = s.replace(/(..)/g, "%$1");
        s = decodeURIComponent(s);
        return s;
    };

    /**
     * get a hexadecimal string of subjectPublicKeyInfo field.<br/>
     * @name getPublicKeyHex
     * @memberOf X509#
     * @function
     * @return {String} ASN.1 SEQUENCE hexadecimal string of subjectPublicKeyInfo field
     * @since jsrsasign 7.1.4 x509 1.1.13
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM);
     * hSPKI = x.getPublicKeyHex(); // return string like "30820122..."
     */
    this.getPublicKeyHex = function() {
	return _ASN1HEX.getTLVbyList(this.hex, 0, [0, 6 + this.foffset], "30");
    };

    /**
     * get a string index of subjectPublicKeyInfo field for hexadecimal string certificate.<br/>
     * @name getPublicKeyIdx
     * @memberOf X509#
     * @function
     * @return {Number} string index of subjectPublicKeyInfo field for hexadecimal string certificate.
     * @since jsrsasign 7.1.4 x509 1.1.13
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM);
     * idx = x.getPublicKeyIdx(); // return string index in x.hex parameter
     */
    this.getPublicKeyIdx = function() {
	return _getIdxbyList(this.hex, 0, [0, 6 + this.foffset], "30");
    };

    /**
     * get a string index of contents of subjectPublicKeyInfo BITSTRING value from hexadecimal certificate<br/>
     * @name getPublicKeyContentIdx
     * @memberOf X509#
     * @function
     * @return {Integer} string index of key contents
     * @since jsrsasign 8.0.0 x509 1.2.0
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM);
     * idx = x.getPublicKeyContentIdx(); // return string index in x.hex parameter
     */
    // NOTE: Without BITSTRING encapsulation.
    this.getPublicKeyContentIdx = function() {
	var idx = this.getPublicKeyIdx();
	return _getIdxbyList(this.hex, idx, [1, 0], "30");
    };

    /**
     * get a RSAKey/ECDSA/DSA public key object of subjectPublicKeyInfo field.<br/>
     * @name getPublicKey
     * @memberOf X509#
     * @function
     * @return {Object} RSAKey/ECDSA/DSA public key object of subjectPublicKeyInfo field
     * @since jsrsasign 7.1.4 x509 1.1.13
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM);
     * pubkey= x.getPublicKey();
     */
    this.getPublicKey = function() {
	return KEYUTIL.getKey(this.getPublicKeyHex(), null, "pkcs8pub");
    };

    /**
     * get signature algorithm name from hexadecimal certificate data
     * @name getSignatureAlgorithmName
     * @memberOf X509#
     * @function
     * @param {String} hCert hexadecimal string of X.509 certificate binary
     * @return {String} signature algorithm name (ex. SHA1withRSA, SHA256withECDSA)
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method will get signature algorithm name of certificate:
     * @example
     * var x = new X509();
     * x.readCertPEM(sCertPEM);
     * x.getSignatureAlgorithmName() &rarr; "SHA256withRSA"
     */
    this.getSignatureAlgorithmName = function() {
	return _oidname(_getVbyList(this.hex, 0, [1, 0], "06"));
    };

    /**
     * get signature value in hexadecimal string<br/>
     * @name getSignatureValueHex
     * @memberOf X509#
     * @function
     * @return {String} signature value hexadecimal string without BitString unused bits
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method will get signature value of certificate:
     * @example
     * var x = new X509();
     * x.readCertPEM(sCertPEM);
     * x.getSignatureValueHex() &rarr "8a4c47913..."
     */
    this.getSignatureValueHex = function() {
	return _getVbyList(this.hex, 0, [2], "03", true);
    };

    /**
     * verifies signature value by public key<br/>
     * @name verifySignature
     * @memberOf X509#
     * @function
     * @param {Object} pubKey public key object
     * @return {Boolean} true if signature value is valid otherwise false
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method verifies signature value of hexadecimal string of 
     * X.509 certificate by specified public key object.
     * @example
     * pubKey = KEYUTIL.getKey(pemPublicKey); // or certificate
     * x = new X509();
     * x.readCertPEM(pemCert);
     * x.verifySignature(pubKey) &rarr; true, false or raising exception
     */
    this.verifySignature = function(pubKey) {
	var algName = this.getSignatureAlgorithmName();
	var hSigVal = this.getSignatureValueHex();
	var hTbsCert = _getTLVbyList(this.hex, 0, [0], "30");
	
	var sig = new KJUR.crypto.Signature({alg: algName});
	sig.init(pubKey);
	sig.updateHex(hTbsCert);
	return sig.verify(hSigVal);
    };

    // ===== parse extension ======================================
    /**
     * set array of X.509v3 extesion information such as extension OID, criticality and value index.<br/>
     * @name parseExt
     * @memberOf X509#
     * @function
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method will set an array of X.509v3 extension information having 
     * following parameters:
     * <ul>
     * <li>oid - extension OID (ex. 2.5.29.19)</li>
     * <li>critical - true or false</li>
     * <li>vidx - string index for extension value</li>
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // parseExt() will also be called internally.
     *
     * x.aExtInfo &rarr;
     * [ { oid: "2.5.29,19", critical: true, vidx: 2504 }, ... ]
     */
    this.parseExt = function() {
	if (this.version !== 3) return -1;
	var iExtSeq = _getIdxbyList(this.hex, 0, [0, 7, 0], "30");
	var aExtIdx = _getChildIdx(this.hex, iExtSeq);

	this.aExtInfo = new Array();
	for (var i = 0; i < aExtIdx.length; i++) {
	    var item = {};
	    item.critical = false;
	    var a = _getChildIdx(this.hex, aExtIdx[i]);
	    var offset = 0;

	    if (a.length === 3) {
		item.critical = true;
		offset = 1;
	    }

	    item.oid = _ASN1HEX.hextooidstr(_getVbyList(this.hex, aExtIdx[i], [0], "06"));
	    var octidx = _getIdxbyList(this.hex, aExtIdx[i], [1 + offset]);
	    item.vidx = _getVidx(this.hex, octidx);
	    this.aExtInfo.push(item);
	}
    };

    /**
     * get a X.509v3 extesion information such as extension OID, criticality and value index for specified oid or name.<br/>
     * @name getExtInfo
     * @memberOf X509#
     * @function
     * @param {String} oidOrName X.509 extension oid or name (ex. keyUsage or 2.5.29.19)
     * @return X.509 extension information such as extension OID or value indx (see {@link X509#parseExt})
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method will get an X.509v3 extension information JSON object
     * having extension OID, criticality and value idx for specified
     * extension OID or name.
     * If there is no such extension, this returns undefined.
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // parseExt() will also be called internally.
     *
     * x.getExtInfo("keyUsage") &rarr; { oid: "2.5.29.15", critical: true, vidx: 1714 }
     * x.getExtInfo("unknownExt") &rarr; undefined
     */
    this.getExtInfo = function(oidOrName) {
	var a = this.aExtInfo;
	var oid = oidOrName;
	if (! oidOrName.match(/^[0-9.]+$/)) {
	    oid = KJUR.asn1.x509.OID.name2oid(oidOrName);
	}
	if (oid === '') return undefined;

	for (var i = 0; i < a.length; i++) {
	    if (a[i].oid === oid) return a[i];
	}
	return undefined;
    };

    /**
     * get BasicConstraints extension value as object in the certificate
     * @name getExtBasicConstraints
     * @memberOf X509#
     * @function
     * @return {Object} associative array which may have "cA" and "pathLen" parameters
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method will get basic constraints extension value as object with following paramters.
     * <ul>
     * <li>cA - CA flag whether CA or not</li>
     * <li>pathLen - maximum intermediate certificate length</li>
     * </ul>
     * There are use cases for return values:
     * <ul>
     * <li>{cA:true, pathLen:3} - cA flag is true and pathLen is 3</li>
     * <li>{cA:true} - cA flag is true and no pathLen</li>
     * <li>{} - basic constraints has no value in case of end entity certificate</li>
     * <li>undefined - there is no basic constraints extension</li>
     * </ul>
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // parseExt() will also be called internally.
     * x.getExtBasicConstraints() &rarr; { cA: true, pathLen: 3 };
     */
    this.getExtBasicConstraints = function() {
	var info = this.getExtInfo("basicConstraints");
	if (info === undefined) return info;

	var hBC = _getV(this.hex, info.vidx);
	if (hBC === '') return {};
	if (hBC === '0101ff') return { cA: true };
	if (hBC.substr(0, 8) === '0101ff02') {
	    var pathLexHex = _getV(hBC, 6);
	    var pathLen = parseInt(pathLexHex, 16);
	    return { cA: true, pathLen: pathLen };
	}
	throw "basicConstraints parse error";
    };


    /**
     * get KeyUsage extension value as binary string in the certificate<br/>
     * @name getExtKeyUsageBin
     * @memberOf X509#
     * @function
     * @return {String} binary string of key usage bits (ex. '101')
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method will get key usage extension value
     * as binary string such like '101'.
     * Key usage bits definition is in the RFC 5280.
     * If there is no key usage extension in the certificate,
     * it returns empty string (i.e. '').
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // parseExt() will also be called internally.
     * x.getExtKeyUsageBin() &rarr; '101'
     * // 1 - digitalSignature
     * // 0 - nonRepudiation
     * // 1 - keyEncipherment
     */
    this.getExtKeyUsageBin = function() {
	var info = this.getExtInfo("keyUsage");
	if (info === undefined) return '';
	
	var hKeyUsage = _getV(this.hex, info.vidx);
	if (hKeyUsage.length % 2 != 0 || hKeyUsage.length <= 2)
	    throw "malformed key usage value";
	var unusedBits = parseInt(hKeyUsage.substr(0, 2));
	var bKeyUsage = parseInt(hKeyUsage.substr(2), 16).toString(2);
	return bKeyUsage.substr(0, bKeyUsage.length - unusedBits);
    };

    /**
     * get KeyUsage extension value as names in the certificate<br/>
     * @name getExtKeyUsageString
     * @memberOf X509#
     * @function
     * @return {String} comma separated string of key usage
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method will get key usage extension value
     * as comma separated string of usage names.
     * If there is no key usage extension in the certificate,
     * it returns empty string (i.e. '').
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // parseExt() will also be called internally.
     * x.getExtKeyUsageString() &rarr; "digitalSignature,keyEncipherment"
     */
    this.getExtKeyUsageString = function() {
	var bKeyUsage = this.getExtKeyUsageBin();
	var a = new Array();
	for (var i = 0; i < bKeyUsage.length; i++) {
	    if (bKeyUsage.substr(i, 1) == "1") a.push(X509.KEYUSAGE_NAME[i]);
	}
	return a.join(",");
    };

    /**
     * get subjectKeyIdentifier value as hexadecimal string in the certificate<br/>
     * @name getExtSubjectKeyIdentifier
     * @memberOf X509#
     * @function
     * @return {String} hexadecimal string of subject key identifier or null
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method will get subject key identifier extension value
     * as hexadecimal string.
     * If there is this in the certificate, it returns undefined;
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // parseExt() will also be called internally.
     * x.getExtSubjectKeyIdentifier() &rarr; "1b3347ab...";
     */
    this.getExtSubjectKeyIdentifier = function() {
	var info = this.getExtInfo("subjectKeyIdentifier");
	if (info === undefined) return info;

	return _getV(this.hex, info.vidx);
    };

    /**
     * get authorityKeyIdentifier value as JSON object in the certificate<br/>
     * @name getExtAuthorityKeyIdentifier
     * @memberOf X509#
     * @function
     * @return {Object} JSON object of authority key identifier or null
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method will get authority key identifier extension value
     * as JSON object.
     * If there is this in the certificate, it returns undefined;
     * <br>
     * NOTE: Currently this method only supports keyIdentifier so that
     * authorityCertIssuer and authorityCertSerialNumber will not
     * be return in the JSON object.
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // parseExt() will also be called internally.
     * x.getExtAuthorityKeyIdentifier() &rarr; { kid: "1234abcd..." }
     */
    this.getExtAuthorityKeyIdentifier = function() {
	var info = this.getExtInfo("authorityKeyIdentifier");
	if (info === undefined) return info;

	var result = {};
	var hAKID = _getTLV(this.hex, info.vidx);
	var a = _getChildIdx(hAKID, 0);
	for (var i = 0; i < a.length; i++) {
	    if (hAKID.substr(a[i], 2) === "80")
		result.kid = _getV(hAKID, a[i]);
	}
	return result;
    };

    /**
     * get extKeyUsage value as array of name string in the certificate<br/>
     * @name getExtExtKeyUsageName
     * @memberOf X509#
     * @function
     * @return {Object} array of extended key usage ID name or oid
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method will get extended key usage extension value
     * as array of name or OID string.
     * If there is this in the certificate, it returns undefined;
     * <br>
     * NOTE: Supported extended key usage ID names are defined in
     * name2oidList parameter in asn1x509.js file.
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // parseExt() will also be called internally.
     * x.getExtExtKeyUsageName() &rarr; ["serverAuth", "clientAuth", "0.1.2.3.4.5"]
     */
    this.getExtExtKeyUsageName = function() {
	var info = this.getExtInfo("extKeyUsage");
	if (info === undefined) return info;

	var result = new Array();
	
	var h = _getTLV(this.hex, info.vidx);
	if (h === '') return result;

	var a = _getChildIdx(h, 0);
	for (var i = 0; i < a.length; i++) {
	    result.push(_oidname(_getV(h, a[i])));
	}

	return result;
    };

    /**
     * (DEPRECATED) get subjectAltName value as array of string in the certificate
     * @name getExtSubjectAltName
     * @memberOf X509#
     * @function
     * @return {Object} array of alt names
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @deprecated since jsrsasign 8.0.1 x509 1.1.17. Please move to {@link X509#getExtSubjectAltName2}
     * @description
     * This method will get subject alt name extension value
     * as array of name.
     * If there is this in the certificate, it returns undefined;
     * <br>
     * NOTE: Currently this method supports only dNSName so that
     * other name type such like iPAddress or generalName will not be returned.
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // parseExt() will also be called internally.
     * x.getExtSubjectAltName() &rarr; ["example.com", "example.org"]
     */
    this.getExtSubjectAltName = function() {
	var a = this.getExtSubjectAltName2();
	var result = new Array();

	for (var i = 0; i < a.length; i++) {
	    if (a[i][0] === "DNS") result.push(a[i][1]);
	}
	return result;
    };

    /**
     * get subjectAltName value as array of string in the certificate
     * @name getExtSubjectAltName2
     * @memberOf X509#
     * @function
     * @return {Object} array of alt name array
     * @since jsrsasign 8.0.1 x509 1.1.17
     * @description
     * This method will get subject alt name extension value
     * as array of type and name.
     * If there is this in the certificate, it returns undefined;
     * Type of GeneralName will be shown as following:
     * <ul>
     * <li>"MAIL" - [1]rfc822Name</li>
     * <li>"DNS"  - [2]dNSName</li>
     * <li>"DN"   - [4]directoryName</li>
     * <li>"URI"  - [6]uniformResourceIdentifier</li>
     * <li>"IP"   - [7]iPAddress</li>
     * </ul>
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // parseExt() will also be called internally.
     * x.getExtSubjectAltName2() &rarr;
     * [["DNS",  "example.com"],
     *  ["DNS",  "example.org"],
     *  ["MAIL", "foo@example.com"],
     *  ["IP",   "192.168.1.1"],
     *  ["IP",   "2001:db8::2:1"],
     *  ["DN",   "/C=US/O=TEST1"]]
     */
    this.getExtSubjectAltName2 = function() {
	var gnValueHex, gnValueStr, gnTag;
	var info = this.getExtInfo("subjectAltName");
	if (info === undefined) return info;

	var result = new Array();
	var h = _getTLV(this.hex, info.vidx);

	var a = _getChildIdx(h, 0);
	for (var i = 0; i < a.length; i++) {
	    gnTag = h.substr(a[i], 2);
	    gnValueHex = _getV(h, a[i]);
	    
	    if (gnTag === "81") { // rfc822Name [1]
		gnValueStr = hextoutf8(gnValueHex);
		result.push(["MAIL", gnValueStr]);
	    }
	    if (gnTag === "82") { // dNSName [2]
		gnValueStr = hextoutf8(gnValueHex);
		result.push(["DNS", gnValueStr]);
	    }
	    if (gnTag === "84") { // directoryName [4]
		gnValueStr = X509.hex2dn(gnValueHex, 0);
		result.push(["DN", gnValueStr]);
	    }
	    if (gnTag === "86") { // uniformResourceIdentifier [6]
		gnValueStr = hextoutf8(gnValueHex);
		result.push(["URI", gnValueStr]);
	    }
	    if (gnTag === "87") { // iPAddress [7]
		gnValueStr = hextoip(gnValueHex);
		result.push(["IP", gnValueStr]);
	    }
	}
	return result;
    };

    /**
     * get array of string for fullName URIs in cRLDistributionPoints(CDP) in the certificate
     * @name getExtCRLDistributionPointsURI
     * @memberOf X509#
     * @function
     * @return {Object} array of fullName URIs of CDP of the certificate
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method will get all fullName URIs of cRLDistributionPoints extension
     * in the certificate as array of URI string.
     * If there is this in the certificate, it returns undefined;
     * <br>
     * NOTE: Currently this method supports only fullName URI so that
     * other parameters will not be returned.
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // parseExt() will also be called internally.
     * x.getExtCRLDistributionPointsURI() &rarr;
     * ["http://example.com/aaa.crl", "http://example.org/aaa.crl"]
     */
    this.getExtCRLDistributionPointsURI = function() {
	var info = this.getExtInfo("cRLDistributionPoints");
	if (info === undefined) return info;

	var result = new Array();
	var a = _getChildIdx(this.hex, info.vidx);
	for (var i = 0; i < a.length; i++) {
	    try {
		var hURI = _getVbyList(this.hex, a[i], [0, 0, 0], "86");
		var uri = hextoutf8(hURI);
		result.push(uri);
	    } catch(ex) {};
	}

	return result;
    };

    /**
     * get AuthorityInfoAccess extension value in the certificate as associative array
     * @name getExtAIAInfo
     * @memberOf X509#
     * @function
     * @return {Object} associative array of AIA extension properties
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method will get authority info access value
     * as associate array which has following properties:
     * <ul>
     * <li>ocsp - array of string for OCSP responder URL</li>
     * <li>caissuer - array of string for caIssuer value (i.e. CA certificates URL)</li>
     * </ul>
     * If there is this in the certificate, it returns undefined;
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // parseExt() will also be called internally.
     * x.getExtAIAInfo(hCert) &rarr; 
     * { ocsp:     ["http://ocsp.foo.com"],
     *   caissuer: ["http://rep.foo.com/aaa.p8m"] }
     */
    this.getExtAIAInfo = function() {
	var info = this.getExtInfo("authorityInfoAccess");
	if (info === undefined) return info;

	var result = { ocsp: [], caissuer: [] };
	var a = _getChildIdx(this.hex, info.vidx);
	for (var i = 0; i < a.length; i++) {
	    var hOID = _getVbyList(this.hex, a[i], [0], "06");
	    var hName = _getVbyList(this.hex, a[i], [1], "86");
	    if (hOID === "2b06010505073001") {
		result.ocsp.push(hextoutf8(hName));
	    }
	    if (hOID === "2b06010505073002") {
		result.caissuer.push(hextoutf8(hName));
	    }
	}

	return result;
    };

    /**
     * get CertificatePolicies extension value in the certificate as array
     * @name getExtCertificatePolicies
     * @memberOf X509#
     * @function
     * @return {Object} array of PolicyInformation JSON object
     * @since jsrsasign 7.2.0 x509 1.1.14
     * @description
     * This method will get certificate policies value
     * as an array of JSON object which has following properties:
     * <ul>
     * <li>id - </li>
     * <li>cps - URI of certification practice statement</li>
     * <li>unotice - string of UserNotice explicitText</li>
     * </ul>
     * If there is this extension in the certificate,
     * it returns undefined;
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // parseExt() will also be called internally.
     * x.getExtCertificatePolicies &rarr; 
     * [{ id: 1.2.3.4,
     *    cps: "http://example.com/cps",
     *    unotice: "explicit text" }]
     */
    this.getExtCertificatePolicies = function() {
	var info = this.getExtInfo("certificatePolicies");
	if (info === undefined) return info;
	
	var hExt = _getTLV(this.hex, info.vidx);
	var result = [];

	var a = _getChildIdx(hExt, 0);
	for (var i = 0; i < a.length; i++) {
	    var policyInfo = {};
	    var a1 = _getChildIdx(hExt, a[i]);

	    policyInfo.id = _oidname(_getV(hExt, a1[0]));

	    if (a1.length === 2) {
		var a2 = _getChildIdx(hExt, a1[1]);

		for (var j = 0; j < a2.length; j++) {
		    var hQualifierId = _getVbyList(hExt, a2[j], [0], "06");

		    if (hQualifierId === "2b06010505070201") { // cps
			policyInfo.cps = hextoutf8(_getVbyList(hExt, a2[j], [1]));
		    } else if (hQualifierId === "2b06010505070202") { // unotice
			policyInfo.unotice =
			    hextoutf8(_getVbyList(hExt, a2[j], [1, 0]));
		    }
		}
	    }

	    result.push(policyInfo);
	}

	return result;
    }

    // ===== read certificate =====================================
    /**
     * read PEM formatted X.509 certificate from string.<br/>
     * @name readCertPEM
     * @memberOf X509#
     * @function
     * @param {String} sCertPEM string for PEM formatted X.509 certificate
     * @example
     * x = new X509();
     * x.readCertPEM(sCertPEM); // read certificate
     */
    this.readCertPEM = function(sCertPEM) {
        this.readCertHex(_pemtohex(sCertPEM));
    };

    /**
     * read a hexadecimal string of X.509 certificate<br/>
     * @name readCertHex
     * @memberOf X509#
     * @function
     * @param {String} sCertHex hexadecimal string of X.509 certificate
     * @since jsrsasign 7.1.4 x509 1.1.13
     * @description
     * NOTE: {@link X509#parseExt} will called internally since jsrsasign 7.2.0.
     * @example
     * x = new X509();
     * x.readCertHex("3082..."); // read certificate
     */
    this.readCertHex = function(sCertHex) {
        this.hex = sCertHex;
	this.getVersion(); // set version parameter

	try {
	    _getIdxbyList(this.hex, 0, [0, 7], "a3"); // has [3] v3ext
	    this.parseExt();
	} catch(ex) {};
    };

    /**
     * get certificate information as string.<br/>
     * @name getInfo
     * @memberOf X509#
     * @function
     * @return {String} certificate information string
     * @since jsrsasign 5.0.10 x509 1.1.8
     * @example
     * x = new X509();
     * x.readCertPEM(certPEM);
     * console.log(x.getInfo());
     * // this shows as following
     * Basic Fields
     *   serial number: 02ac5c266a0b409b8f0b79f2ae462577
     *   signature algorithm: SHA1withRSA
     *   issuer: /C=US/O=DigiCert Inc/OU=www.digicert.com/CN=DigiCert High Assurance EV Root CA
     *   notBefore: 061110000000Z
     *   notAfter: 311110000000Z
     *   subject: /C=US/O=DigiCert Inc/OU=www.digicert.com/CN=DigiCert High Assurance EV Root CA
     *   subject public key info:
     *     key algorithm: RSA
     *     n=c6cce573e6fbd4bb...
     *     e=10001
     * X509v3 Extensions:
     *   keyUsage CRITICAL:
     *     digitalSignature,keyCertSign,cRLSign
     *   basicConstraints CRITICAL:
     *     cA=true
     *   subjectKeyIdentifier :
     *     b13ec36903f8bf4701d498261a0802ef63642bc3
     *   authorityKeyIdentifier :
     *     kid=b13ec36903f8bf4701d498261a0802ef63642bc3
     * signature algorithm: SHA1withRSA
     * signature: 1c1a0697dcd79c9f...
     */
    this.getInfo = function() {
	var _X509 = X509;
	var s, pubkey, aExt;
	s  = "Basic Fields\n";
        s += "  serial number: " + this.getSerialNumberHex() + "\n";
	s += "  signature algorithm: " + this.getSignatureAlgorithmField() + "\n";
	s += "  issuer: " + this.getIssuerString() + "\n";
	s += "  notBefore: " + this.getNotBefore() + "\n";
	s += "  notAfter: " + this.getNotAfter() + "\n";
	s += "  subject: " + this.getSubjectString() + "\n";
	s += "  subject public key info: " + "\n";

	// subject public key info
	pubkey = this.getPublicKey();
	s += "    key algorithm: " + pubkey.type + "\n";

	if (pubkey.type === "RSA") {
	    s += "    n=" + hextoposhex(pubkey.n.toString(16)).substr(0, 16) + "...\n";
	    s += "    e=" + hextoposhex(pubkey.e.toString(16)) + "\n";
	}

	// X.509v3 Extensions
        aExt = this.aExtInfo;

	if (aExt !== undefined && aExt !== null) {
            s += "X509v3 Extensions:\n";
	    
            for (var i = 0; i < aExt.length; i++) {
		var info = aExt[i];

		// show extension name and critical flag
		var extName = KJUR.asn1.x509.OID.oid2name(info["oid"]);
		if (extName === '') extName = info["oid"];

		var critical = '';
		if (info["critical"] === true) critical = "CRITICAL";

		s += "  " + extName + " " + critical + ":\n";

		// show extension value if supported
		if (extName === "basicConstraints") {
		    var bc = this.getExtBasicConstraints();
		    if (bc.cA === undefined) {
			s += "    {}\n";
		    } else {
			s += "    cA=true";
			if (bc.pathLen !== undefined)
			    s += ", pathLen=" + bc.pathLen;
			s += "\n";
		    }
		} else if (extName === "keyUsage") {
		    s += "    " + this.getExtKeyUsageString() + "\n";
		} else if (extName === "subjectKeyIdentifier") {
		    s += "    " + this.getExtSubjectKeyIdentifier() + "\n";
		} else if (extName === "authorityKeyIdentifier") {
		    var akid = this.getExtAuthorityKeyIdentifier();
		    if (akid.kid !== undefined)
			s += "    kid=" + akid.kid + "\n";
		} else if (extName === "extKeyUsage") {
		    var eku = this.getExtExtKeyUsageName();
		    s += "    " + eku.join(", ") + "\n";
		} else if (extName === "subjectAltName") {
		    var san = this.getExtSubjectAltName2();
		    s += "    " + san + "\n";
		} else if (extName === "cRLDistributionPoints") {
		    var cdp = this.getExtCRLDistributionPointsURI();
		    s += "    " + cdp + "\n";
		} else if (extName === "authorityInfoAccess") {
		    var aia = this.getExtAIAInfo();
		    if (aia.ocsp !== undefined)
			s += "    ocsp: " + aia.ocsp.join(",") + "\n";
		    if (aia.caissuer !== undefined)
			s += "    caissuer: " + aia.caissuer.join(",") + "\n";
		} else if (extName === "certificatePolicies") {
		    var aCP = this.getExtCertificatePolicies();
		    for (var j = 0; j < aCP.length; j++) {
			if (aCP[j].id !== undefined)
			    s += "    policy oid: " + aCP[j].id + "\n";
			if (aCP[j].cps !== undefined)
			    s += "    cps: " + aCP[j].cps + "\n";
		    }
		}
	    }
        }

	s += "signature algorithm: " + this.getSignatureAlgorithmName() + "\n";
	s += "signature: " + this.getSignatureValueHex().substr(0, 16) + "...\n";
	return s;
    };
};

/**
 * get distinguished name string in OpenSSL online format from hexadecimal string of ASN.1 DER X.500 name<br/>
 * @name hex2dn
 * @memberOf X509
 * @function
 * @param {String} hex hexadecimal string of ASN.1 DER distinguished name
 * @param {Integer} idx index of hexadecimal string (DEFAULT=0)
 * @return {String} OpenSSL online format distinguished name
 * @description
 * This static method converts from a hexadecimal string of 
 * distinguished name (DN)
 * specified by 'hex' and 'idx' to OpenSSL oneline string representation (ex. /C=US/O=a).
 * @example
 * X509.hex2dn("3031310b3...") &rarr; /C=US/O=a/CN=b2+OU=b1
 */
X509.hex2dn = function(hex, idx) {
    if (idx === undefined) idx = 0;
    if (hex.substr(idx, 2) !== "30") throw "malformed DN";

    var a = new Array();

    var aIdx = ASN1HEX.getChildIdx(hex, idx);
    for (var i = 0; i < aIdx.length; i++) {
	a.push(X509.hex2rdn(hex, aIdx[i]));
    }

    a = a.map(function(s) { return s.replace("/", "\\/"); });
    return "/" + a.join("/");
};

/**
 * get relative distinguished name string in OpenSSL online format from hexadecimal string of ASN.1 DER RDN<br/>
 * @name hex2rdn
 * @memberOf X509
 * @function
 * @param {String} hex hexadecimal string of ASN.1 DER concludes relative distinguished name
 * @param {Integer} idx index of hexadecimal string (DEFAULT=0)
 * @return {String} OpenSSL online format relative distinguished name
 * @description
 * This static method converts from a hexadecimal string of 
 * relative distinguished name (RDN)
 * specified by 'hex' and 'idx' to LDAP string representation (ex. O=test+CN=test).<br/>
 * NOTE: Multi-valued RDN is supported since jsnrsasign 6.2.2 x509 1.1.10.
 * @example
 * X509.hex2rdn("310a3008060355040a0c0161") &rarr; O=a
 * X509.hex2rdn("31143008060355040a0c01613008060355040a0c0162") &rarr; O=a+O=b
 */
X509.hex2rdn = function(hex, idx) {
    if (idx === undefined) idx = 0;
    if (hex.substr(idx, 2) !== "31") throw "malformed RDN";

    var a = new Array();

    var aIdx = ASN1HEX.getChildIdx(hex, idx);
    for (var i = 0; i < aIdx.length; i++) {
	a.push(X509.hex2attrTypeValue(hex, aIdx[i]));
    }

    a = a.map(function(s) { return s.replace("+", "\\+"); });
    return a.join("+");
};

/**
 * get string from hexadecimal string of ASN.1 DER AttributeTypeAndValue<br/>
 * @name hex2attrTypeValue
 * @memberOf X509
 * @function
 * @param {String} hex hexadecimal string of ASN.1 DER concludes AttributeTypeAndValue
 * @param {Integer} idx index of hexadecimal string (DEFAULT=0)
 * @return {String} string representation of AttributeTypeAndValue (ex. C=US)
 * @description
 * This static method converts from a hexadecimal string of AttributeTypeAndValue
 * specified by 'hex' and 'idx' to LDAP string representation (ex. C=US).
 * @example
 * X509.hex2attrTypeValue("3008060355040a0c0161") &rarr; O=a
 * X509.hex2attrTypeValue("300806035504060c0161") &rarr; C=a
 * X509.hex2attrTypeValue("...3008060355040a0c0161...", 128) &rarr; O=a
 */
X509.hex2attrTypeValue = function(hex, idx) {
    var _ASN1HEX = ASN1HEX;
    var _getV = _ASN1HEX.getV;

    if (idx === undefined) idx = 0;
    if (hex.substr(idx, 2) !== "30") throw "malformed attribute type and value";

    var aIdx = _ASN1HEX.getChildIdx(hex, idx);
    if (aIdx.length !== 2 || hex.substr(aIdx[0], 2) !== "06")
	"malformed attribute type and value";

    var oidHex = _getV(hex, aIdx[0]);
    var oidInt = KJUR.asn1.ASN1Util.oidHexToInt(oidHex);
    var atype = KJUR.asn1.x509.OID.oid2atype(oidInt);

    var hV = _getV(hex, aIdx[1]);
    var rawV = hextorstr(hV);

    return atype + "=" + rawV;
};

/**
 * get RSA/DSA/ECDSA public key object from X.509 certificate hexadecimal string<br/>
 * @name getPublicKeyFromCertHex
 * @memberOf X509
 * @function
 * @param {String} h hexadecimal string of X.509 certificate for RSA/ECDSA/DSA public key
 * @return returns RSAKey/KJUR.crypto.{ECDSA,DSA} object of public key
 * @since jsrasign 7.1.0 x509 1.1.11
 */
X509.getPublicKeyFromCertHex = function(h) {
    var x = new X509();
    x.readCertHex(h);
    return x.getPublicKey();
};

/**
 * get RSA/DSA/ECDSA public key object from PEM certificate string
 * @name getPublicKeyFromCertPEM
 * @memberOf X509
 * @function
 * @param {String} sCertPEM PEM formatted RSA/ECDSA/DSA X.509 certificate
 * @return returns RSAKey/KJUR.crypto.{ECDSA,DSA} object of public key
 * @since x509 1.1.1
 * @description
 * NOTE: DSA is also supported since x509 1.1.2.
 */
X509.getPublicKeyFromCertPEM = function(sCertPEM) {
    var x = new X509();
    x.readCertPEM(sCertPEM);
    return x.getPublicKey();
};

/**
 * get public key information from PEM certificate
 * @name getPublicKeyInfoPropOfCertPEM
 * @memberOf X509
 * @function
 * @param {String} sCertPEM string of PEM formatted certificate
 * @return {Hash} hash of information for public key
 * @since x509 1.1.1
 * @description
 * Resulted associative array has following properties:<br/>
 * <ul>
 * <li>algoid - hexadecimal string of OID of asymmetric key algorithm</li>
 * <li>algparam - hexadecimal string of OID of ECC curve name or null</li>
 * <li>keyhex - hexadecimal string of key in the certificate</li>
 * </ul>
 * NOTE: X509v1 certificate is also supported since x509.js 1.1.9.
 */
X509.getPublicKeyInfoPropOfCertPEM = function(sCertPEM) {
    var _ASN1HEX = ASN1HEX;
    var _getVbyList = _ASN1HEX.getVbyList;

    var result = {};
    var x, hSPKI, pubkey;
    result.algparam = null;

    x = new X509();
    x.readCertPEM(sCertPEM);

    hSPKI = x.getPublicKeyHex();
    result.keyhex = _getVbyList(hSPKI, 0, [1], "03").substr(2);
    result.algoid = _getVbyList(hSPKI, 0, [0, 0], "06");

    if (result.algoid === "2a8648ce3d0201") { // ecPublicKey
	result.algparam = _getVbyList(hSPKI, 0, [0, 1], "06");
    };

    return result;
};

/* ======================================================================
 *   Specific V3 Extensions
 * ====================================================================== */

X509.KEYUSAGE_NAME = [
    "digitalSignature",
    "nonRepudiation",
    "keyEncipherment",
    "dataEncipherment",
    "keyAgreement",
    "keyCertSign",
    "cRLSign",
    "encipherOnly",
    "decipherOnly"
];
/* jws-3.3.11 (c) 2013-2018 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * jws.js - JSON Web Signature(JWS) and JSON Web Token(JWT) Class
 *
 * Copyright (c) 2010-2018 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license/
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name jws-3.3.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version jsrsasign 8.0.3 jws 3.3.11 (2018-Mar-11)
 * @since jsjws 1.0, jsrsasign 4.8.0
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

if (typeof KJUR == "undefined" || !KJUR) KJUR = {};

/**
 * kjur's JSON Web Signature/Token(JWS/JWT) library name space
 * <p>
 * This namespace privides following JWS/JWS related classes.
 * <ul>
 * <li>{@link KJUR.jws.JWS} - JSON Web Signature/Token(JWS/JWT) class</li>
 * <li>{@link KJUR.jws.JWSJS} - JWS JSON Serialization(JWSJS) class</li>
 * <li>{@link KJUR.jws.IntDate} - UNIX origin time utility class</li>
 * </ul>
 * NOTE: Please ignore method summary and document of this namespace. This caused by a bug of jsdoc2.
 * </p>
 * @name KJUR.jws
 * @namespace
 */
if (typeof KJUR.jws == "undefined" || !KJUR.jws) KJUR.jws = {};

/**
 * JSON Web Signature(JWS) class.<br/>
 * @name KJUR.jws.JWS
 * @class JSON Web Signature(JWS) class
 * @see <a href="https://kjur.github.io/jsjws/">'jwjws'(JWS JavaScript Library) home page https://kjur.github.io/jsjws/</a>
 * @see <a href="https://kjur.github.io/jsrsasigns/">'jwrsasign'(RSA Sign JavaScript Library) home page https://kjur.github.io/jsrsasign/</a>
 * @see <a href="http://tools.ietf.org/html/draft-ietf-jose-json-web-algorithms-14">IETF I-D JSON Web Algorithms (JWA)</a>
 * @since jsjws 1.0
 * @description
 * This class provides JSON Web Signature(JWS)/JSON Web Token(JWT) signing and validation.
 *
 * <h4>METHOD SUMMARY</h4>
 * Here is major methods of {@link KJUR.jws.JWS} class.
 * <ul>
 * <li><b>SIGN</b><br/>
 * <li>{@link KJUR.jws.JWS.sign} - sign JWS</li>
 * </li>
 * <li><b>VERIFY</b><br/>
 * <li>{@link KJUR.jws.JWS.verify} - verify JWS signature</li>
 * <li>{@link KJUR.jws.JWS.verifyJWT} - verify properties of JWT token at specified time</li>
 * </li>
 * <li><b>UTILITY</b><br/>
 * <li>{@link KJUR.jws.JWS.getJWKthumbprint} - get RFC 7638 JWK thumbprint</li>
 * <li>{@link KJUR.jws.JWS.isSafeJSONString} - check whether safe JSON string or not</li>
 * <li>{@link KJUR.jws.JWS.readSafeJSONString} - read safe JSON string only</li>
 * </li>
 * </ul> 
 *
 * <h4>SUPPORTED SIGNATURE ALGORITHMS</h4>
 * Here is supported algorithm names for {@link KJUR.jws.JWS.sign} and
 * {@link KJUR.jws.JWS.verify} methods.
 * <table>
 * <tr><th>alg value</th><th>spec requirement</th><th>jsjws support</th></tr>
 * <tr><td>HS256</td><td>REQUIRED</td><td>SUPPORTED</td></tr>
 * <tr><td>HS384</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>HS512</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>RS256</td><td>RECOMMENDED</td><td>SUPPORTED</td></tr>
 * <tr><td>RS384</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>RS512</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>ES256</td><td>RECOMMENDED+</td><td>SUPPORTED</td></tr>
 * <tr><td>ES384</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>ES512</td><td>OPTIONAL</td><td>-</td></tr>
 * <tr><td>PS256</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>PS384</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>PS512</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>none</td><td>REQUIRED</td><td>SUPPORTED(signature generation only)</td></tr>
 * </table>
 * <dl>
 * <dt><b>NOTE1</b>
 * <dd>HS384 is supported since jsjws 3.0.2 with jsrsasign 4.1.4.
 * <dt><b>NOTE2</b>
 * <dd>Some deprecated methods have been removed since jws 3.3 of jsrsasign 4.10.0.
 * Removed methods are following:
 * <ul>
 * <li>JWS.verifyJWSByNE</li>
 * <li>JWS.verifyJWSByKey</li>
 * <li>JWS.generateJWSByNED</li>
 * <li>JWS.generateJWSByKey</li>
 * <li>JWS.generateJWSByP1PrvKey</li>
 * </ul>
 * </dl>
 * <b>EXAMPLE</b><br/>
 * @example
 * // JWS signing 
 * sJWS = KJUR.jws.JWS.sign(null, '{"alg":"HS256", "cty":"JWT"}', '{"age": 21}', {"utf8": "password"});
 * // JWS validation
 * isValid = KJUR.jws.JWS.verify('eyJjdHkiOiJKV1QiLCJhbGc...', {"utf8": "password"});
 * // JWT validation
 * isValid = KJUR.jws.JWS.verifyJWT('eyJh...', {"utf8": "password"}, {
 *   alg: ['HS256', 'HS384'],
 *   iss: ['http://foo.com']
 * });
 */
KJUR.jws.JWS = function() {
    var _KJUR = KJUR,
	_KJUR_jws_JWS = _KJUR.jws.JWS,
	_isSafeJSONString = _KJUR_jws_JWS.isSafeJSONString;

    // === utility =============================================================

    /**
     * parse JWS string and set public property 'parsedJWS' dictionary.<br/>
     * @name parseJWS
     * @memberOf KJUR.jws.JWS
     * @function
     * @param {String} sJWS JWS signature string to be parsed.
     * @throws if sJWS is not comma separated string such like "Header.Payload.Signature".
     * @throws if JWS Header is a malformed JSON string.
     * @since jws 1.1
     */
    this.parseJWS = function(sJWS, sigValNotNeeded) {
	if ((this.parsedJWS !== undefined) &&
	    (sigValNotNeeded || (this.parsedJWS.sigvalH !== undefined))) {
	    return;
	}
	var matchResult = sJWS.match(/^([^.]+)\.([^.]+)\.([^.]+)$/);
	if (matchResult == null) {
	    throw "JWS signature is not a form of 'Head.Payload.SigValue'.";
	}
	var b6Head = matchResult[1];
	var b6Payload = matchResult[2];
	var b6SigVal = matchResult[3];
	var sSI = b6Head + "." + b6Payload;
	this.parsedJWS = {};
	this.parsedJWS.headB64U = b6Head;
	this.parsedJWS.payloadB64U = b6Payload;
	this.parsedJWS.sigvalB64U = b6SigVal;
	this.parsedJWS.si = sSI;

	if (!sigValNotNeeded) {
	    var hSigVal = b64utohex(b6SigVal);
	    var biSigVal = parseBigInt(hSigVal, 16);
	    this.parsedJWS.sigvalH = hSigVal;
	    this.parsedJWS.sigvalBI = biSigVal;
	}

	var sHead = b64utoutf8(b6Head);
	var sPayload = b64utoutf8(b6Payload);
	this.parsedJWS.headS = sHead;
	this.parsedJWS.payloadS = sPayload;

	if (! _isSafeJSONString(sHead, this.parsedJWS, 'headP'))
	    throw "malformed JSON string for JWS Head: " + sHead;
    };
};

// === major static method ========================================================

/**
 * generate JWS signature by specified key<br/>
 * @name sign
 * @memberOf KJUR.jws.JWS
 * @function
 * @static
 * @param {String} alg JWS algorithm name to sign and force set to sHead or null 
 * @param {String} spHead string or object of JWS Header
 * @param {String} spPayload string or object of JWS Payload
 * @param {String} key string of private key or mac key object to sign
 * @param {String} pass (OPTION)passcode to use encrypted asymmetric private key 
 * @return {String} JWS signature string
 * @since jws 3.0.0
 * @see <a href="https://kjur.github.io/jsrsasign/api/symbols/KJUR.crypto.Signature.html">jsrsasign KJUR.crypto.Signature method</a>
 * @see <a href="https://kjur.github.io/jsrsasign/api/symbols/KJUR.crypto.Mac.html">jsrsasign KJUR.crypto.Mac method</a>
 * @description
 * This method supports following algorithms.
 * <table>
 * <tr><th>alg value</th><th>spec requirement</th><th>jsjws support</th></tr>
 * <tr><td>HS256</td><td>REQUIRED</td><td>SUPPORTED</td></tr>
 * <tr><td>HS384</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>HS512</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>RS256</td><td>RECOMMENDED</td><td>SUPPORTED</td></tr>
 * <tr><td>RS384</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>RS512</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>ES256</td><td>RECOMMENDED+</td><td>SUPPORTED</td></tr>
 * <tr><td>ES384</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>ES512</td><td>OPTIONAL</td><td>-</td></tr>
 * <tr><td>PS256</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>PS384</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>PS512</td><td>OPTIONAL</td><td>SUPPORTED</td></tr>
 * <tr><td>none</td><td>REQUIRED</td><td>SUPPORTED(signature generation only)</td></tr>
 * </table>
 * <dl>
 * <dt>NOTE1:
 * <dd>salt length of RSAPSS signature is the same as the hash algorithm length
 * because of <a href="http://www.ietf.org/mail-archive/web/jose/current/msg02901.html">IETF JOSE ML discussion</a>.
 * <dt>NOTE2:
 * <dd>To support HS384, patched version of CryptoJS is used.
 * <a href="https://code.google.com/p/crypto-js/issues/detail?id=84">See here for detail</a>.
 * <dt>NOTE3:
 * From jsrsasign 4.10.0 jws 3.3.0, Way to provide password
 * for HS* algorithm is changed. The 'key' attribute value is
 * passed to {@link KJUR.crypto.Mac.setPassword} so please see
 * {@link KJUR.crypto.Mac.setPassword} for detail.
 * As for backword compatibility, if key is a string, has even length and
 * 0..9, A-F or a-f characters, key string is treated as a hexadecimal
 * otherwise it is treated as a raw string.
 * <dd>
 * </dl>
 * <b>EXAMPLE</b><br/>
 * @example
 * // sign HS256 signature with password "aaa" implicitly handled as string
 * sJWS = KJUR.jws.JWS.sign(null, {alg: "HS256", cty: "JWT"}, {age: 21}, "aaa");
 * // sign HS256 signature with password "6161" implicitly handled as hex
 * sJWS = KJUR.jws.JWS.sign(null, {alg: "HS256", cty: "JWT"}, {age: 21}, "6161");
 * // sign HS256 signature with base64 password
 * sJWS = KJUR.jws.JWS.sign(null, {alg: "HS256"}, {age: 21}, {b64: "Mi/8..a="});
 * // sign RS256 signature with PKCS#8 PEM RSA private key
 * sJWS = KJUR.jws.JWS.sign(null, {alg: "RS256"}, {age: 21}, "-----BEGIN PRIVATE KEY...");
 * // sign RS256 signature with PKCS#8 PEM ECC private key with passcode
 * sJWS = KJUR.jws.JWS.sign(null, {alg: "ES256"}, {age: 21}, 
 *                          "-----BEGIN PRIVATE KEY...", "keypass");
 * // header and payload can be passed by both string and object
 * sJWS = KJUR.jws.JWS.sign(null, '{alg:"HS256",cty:"JWT"}', '{age:21}', "aaa");
 */
KJUR.jws.JWS.sign = function(alg, spHeader, spPayload, key, pass) {
    var _KJUR = KJUR,
	_KJUR_jws = _KJUR.jws,
	_KJUR_jws_JWS = _KJUR_jws.JWS,
	_readSafeJSONString = _KJUR_jws_JWS.readSafeJSONString,
	_isSafeJSONString = _KJUR_jws_JWS.isSafeJSONString,
	_KJUR_crypto = _KJUR.crypto,
	_ECDSA = _KJUR_crypto.ECDSA,
	_Mac = _KJUR_crypto.Mac,
	_Signature = _KJUR_crypto.Signature,
	_JSON = JSON;

    var sHeader, pHeader, sPayload;

    // 1. check signatureInput(Header, Payload) is string or object
    if (typeof spHeader != 'string' && typeof spHeader != 'object')
	throw "spHeader must be JSON string or object: " + spHeader;

    if (typeof spHeader == 'object') {
	pHeader = spHeader;
	sHeader = _JSON.stringify(pHeader);
    }

    if (typeof spHeader == 'string') {
	sHeader = spHeader;
	if (! _isSafeJSONString(sHeader))
	    throw "JWS Head is not safe JSON string: " + sHeader;
	pHeader = _readSafeJSONString(sHeader);

    }

    sPayload = spPayload;
    if (typeof spPayload == 'object') sPayload = _JSON.stringify(spPayload);

    // 2. use alg if defined in sHeader
    if ((alg == '' || alg == null) &&
	pHeader['alg'] !== undefined) {
	alg = pHeader['alg'];
    }

    // 3. update sHeader to add alg if alg undefined
    if ((alg != '' && alg != null) &&
	pHeader['alg'] === undefined) {
	pHeader['alg'] = alg;
	sHeader = _JSON.stringify(pHeader);
    }

    // 4. check explicit algorithm doesn't match with JWS header.
    if (alg !== pHeader.alg)
	throw "alg and sHeader.alg doesn't match: " + alg + "!=" + pHeader.alg;

    // 5. set signature algorithm like SHA1withRSA
    var sigAlg = null;
    if (_KJUR_jws_JWS.jwsalg2sigalg[alg] === undefined) {
	throw "unsupported alg name: " + alg;
    } else {
	sigAlg = _KJUR_jws_JWS.jwsalg2sigalg[alg];
    }
    
    var uHeader = utf8tob64u(sHeader);
    var uPayload = utf8tob64u(sPayload);
    var uSignatureInput = uHeader + "." + uPayload
    // 6. sign
    var hSig = "";
    if (sigAlg.substr(0, 4) == "Hmac") {
	if (key === undefined)
	    throw "mac key shall be specified for HS* alg";
	//alert("sigAlg=" + sigAlg);
	var mac = new _Mac({'alg': sigAlg, 'prov': 'cryptojs', 'pass': key});
	mac.updateString(uSignatureInput);
	hSig = mac.doFinal();
    } else if (sigAlg.indexOf("withECDSA") != -1) {
	var sig = new _Signature({'alg': sigAlg});
	sig.init(key, pass);
	sig.updateString(uSignatureInput);
	hASN1Sig = sig.sign();
	hSig = KJUR.crypto.ECDSA.asn1SigToConcatSig(hASN1Sig);
    } else if (sigAlg != "none") {
	var sig = new _Signature({'alg': sigAlg});
	sig.init(key, pass);
	sig.updateString(uSignatureInput);
	hSig = sig.sign();
    }

    var uSig = hextob64u(hSig);
    return uSignatureInput + "." + uSig;
};

/**
 * verify JWS signature by specified key or certificate<br/>
 * @name verify
 * @memberOf KJUR.jws.JWS
 * @function
 * @static
 * @param {String} sJWS string of JWS signature to verify
 * @param {Object} key string of public key, certificate or key object to verify
 * @param {String} acceptAlgs array of algorithm name strings (OPTION)
 * @return {Boolean} true if the signature is valid otherwise false including no signature case or without head and payload
 * @since jws 3.0.0
 * @see <a href="https://kjur.github.io/jsrsasign/api/symbols/KJUR.crypto.Signature.html">jsrsasign KJUR.crypto.Signature method</a>
 * @see <a href="https://kjur.github.io/jsrsasign/api/symbols/KJUR.crypto.Mac.html">jsrsasign KJUR.crypto.Mac method</a>
 * @description
 * <p>
 * This method verifies a JSON Web Signature Compact Serialization string by the validation 
 * algorithm as described in 
 * <a href="http://self-issued.info/docs/draft-jones-json-web-signature-04.html#anchor5">
 * the section 5 of Internet Draft draft-jones-json-web-signature-04.</a>
 * </p>
 * <p>
 * Since 3.2.0 strict key checking has been provided against a JWS algorithm
 * in a JWS header.
 * <ul>
 * <li>In case 'alg' is 'HS*' in the JWS header,
 * 'key' shall be hexadecimal string for Hmac{256,384,512} shared secret key.
 * Otherwise it raise an error.</li>
 * <li>In case 'alg' is 'RS*' or 'PS*' in the JWS header,
 * 'key' shall be a RSAKey object or a PEM string of
 * X.509 RSA public key certificate or PKCS#8 RSA public key.
 * Otherwise it raise an error.</li>
 * <li>In case 'alg' is 'ES*' in the JWS header,
 * 'key' shall be a KJUR.crypto.ECDSA object or a PEM string of
 * X.509 ECC public key certificate or PKCS#8 ECC public key.
 * Otherwise it raise an error.</li>
 * <li>In case 'alg' is 'none' in the JWS header,
 * validation not supported after jsjws 3.1.0.</li>
 * </ul>
 * </p>
 * <p>
 * NOTE1: The argument 'acceptAlgs' is supported since 3.2.0.
 * Strongly recommended to provide acceptAlgs to mitigate
 * signature replacement attacks.<br/>
 * </p>
 * <p>
 * NOTE2: From jsrsasign 4.9.0 jws 3.2.5, Way to provide password
 * for HS* algorithm is changed. The 'key' attribute value is
 * passed to {@link KJUR.crypto.Mac.setPassword} so please see
 * {@link KJUR.crypto.Mac.setPassword} for detail.
 * As for backword compatibility, if key is a string, has even length and
 * 0..9, A-F or a-f characters, key string is treated as a hexadecimal
 * otherwise it is treated as a raw string.
 * </p>
 * @example
 * // 1) verify a RS256 JWS signature by a certificate string.
 * isValid = KJUR.jws.JWS.verify('eyJh...', '-----BEGIN...', ['RS256']);
 * 
 * // 2) verify a HS256 JWS signature by a certificate string.
 * isValid = KJUR.jws.JWS.verify('eyJh...', {hex: '6f62ad...'}, ['HS256']);
 * isValid = KJUR.jws.JWS.verify('eyJh...', {b64: 'Mi/ab8...a=='}, ['HS256']);
 * isValid = KJUR.jws.JWS.verify('eyJh...', {utf8: 'Secret秘密'}, ['HS256']);
 * isValid = KJUR.jws.JWS.verify('eyJh...', '6f62ad', ['HS256']); // implicit hex
 * isValid = KJUR.jws.JWS.verify('eyJh...', '6f62ada', ['HS256']); // implicit raw string
 *
 * // 3) verify a ES256 JWS signature by a KJUR.crypto.ECDSA key object.
 * var pubkey = KEYUTIL.getKey('-----BEGIN CERT...');
 * var isValid = KJUR.jws.JWS.verify('eyJh...', pubkey);
 */
KJUR.jws.JWS.verify = function(sJWS, key, acceptAlgs) {
    var _KJUR = KJUR,
	_KJUR_jws = _KJUR.jws,
	_KJUR_jws_JWS = _KJUR_jws.JWS,
	_readSafeJSONString = _KJUR_jws_JWS.readSafeJSONString,
	_KJUR_crypto = _KJUR.crypto,
	_ECDSA = _KJUR_crypto.ECDSA,
	_Mac = _KJUR_crypto.Mac,
	_Signature = _KJUR_crypto.Signature,
	_RSAKey;
    
    if (typeof RSAKey !== undefined) _RSAKey = RSAKey;

    var a = sJWS.split(".");
    if (a.length !== 3) return false;

    var uHeader = a[0];
    var uPayload = a[1];
    var uSignatureInput = uHeader + "." + uPayload;
    var hSig = b64utohex(a[2]);

    // 1. parse JWS header
    var pHeader = _readSafeJSONString(b64utoutf8(a[0]));
    var alg = null;
    var algType = null; // HS|RS|PS|ES|no
    if (pHeader.alg === undefined) {
	throw "algorithm not specified in header";
    } else {
	alg = pHeader.alg;
	algType = alg.substr(0, 2);
    }

    // 2. check whether alg is acceptable algorithms
    if (acceptAlgs != null &&
        Object.prototype.toString.call(acceptAlgs) === '[object Array]' &&
        acceptAlgs.length > 0) {
	var acceptAlgStr = ":" + acceptAlgs.join(":") + ":";
	if (acceptAlgStr.indexOf(":" + alg + ":") == -1) {
	    throw "algorithm '" + alg + "' not accepted in the list";
	}
    }

    // 3. check whether key is a proper key for alg.
    if (alg != "none" && key === null) {
	throw "key shall be specified to verify.";
    }

    // 3.1. There is no key check for HS* because Mac will check it.
    //      since jsrsasign 5.0.0.

    // 3.2. convert key object if key is a public key or cert PEM string
    if (typeof key == "string" &&
	key.indexOf("-----BEGIN ") != -1) {
	key = KEYUTIL.getKey(key);
    }

    // 3.3. check whether key is RSAKey obj if alg is RS* or PS*.
    if (algType == "RS" || algType == "PS") {
	if (!(key instanceof _RSAKey)) {
	    throw "key shall be a RSAKey obj for RS* and PS* algs";
	}
    }

    // 3.4. check whether key is ECDSA obj if alg is ES*.
    if (algType == "ES") {
	if (!(key instanceof _ECDSA)) {
	    throw "key shall be a ECDSA obj for ES* algs";
	}
    }

    // 3.5. check when alg is 'none'
    if (alg == "none") {
    }

    // 4. check whether alg is supported alg in jsjws.
    var sigAlg = null;
    if (_KJUR_jws_JWS.jwsalg2sigalg[pHeader.alg] === undefined) {
	throw "unsupported alg name: " + alg;
    } else {
	sigAlg = _KJUR_jws_JWS.jwsalg2sigalg[alg];
    }

    // 5. verify
    if (sigAlg == "none") {
        throw "not supported";
    } else if (sigAlg.substr(0, 4) == "Hmac") {
	var hSig2 = null;
	if (key === undefined)
	    throw "hexadecimal key shall be specified for HMAC";
	//try {
	    var mac = new _Mac({'alg': sigAlg, 'pass': key});
	    mac.updateString(uSignatureInput);
	    hSig2 = mac.doFinal();
	//} catch(ex) {};
	return hSig == hSig2;
    } else if (sigAlg.indexOf("withECDSA") != -1) {
	var hASN1Sig = null;
        try {
	    hASN1Sig = _ECDSA.concatSigToASN1Sig(hSig);
	} catch (ex) {
	    return false;
	}
	var sig = new _Signature({'alg': sigAlg});
	sig.init(key)
	sig.updateString(uSignatureInput);
	return sig.verify(hASN1Sig);
    } else {
	var sig = new _Signature({'alg': sigAlg});
	sig.init(key)
	sig.updateString(uSignatureInput);
	return sig.verify(hSig);
    }
};

/**
 * parse header and payload of JWS signature<br/>
 * @name parse
 * @memberOf KJUR.jws.JWS
 * @function
 * @static
 * @param {String} sJWS string of JWS signature to parse
 * @return {Array} associative array of parsed header and payload. See below.
 * @throws if sJWS is malformed JWS signature
 * @since jws 3.3.3
 * @description
 * This method parses JWS signature string. 
 * Resulted associative array has following properties:
 * <ul>
 * <li>headerObj - JSON object of header</li>
 * <li>payloadObj - JSON object of payload if payload is JSON string otherwise undefined</li>
 * <li>headerPP - pretty printed JSON header by stringify</li>
 * <li>payloadPP - pretty printed JSON payload by stringify if payload is JSON otherwise Base64URL decoded raw string of payload</li>
 * <li>sigHex - hexadecimal string of signature</li>
 * </ul>
 * @example
 * KJUR.jws.JWS.parse(sJWS) ->
 * { 
 *   headerObj: {"alg": "RS256", "typ": "JWS"},
 *   payloadObj: {"product": "orange", "quantity": 100},
 *   headerPP: 
 *   '{
 *     "alg": "RS256",
 *     "typ": "JWS"
 *   }',
 *   payloadPP: 
 *   '{
 *     "product": "orange",
 *     "quantity": 100
 *   }',
 *   sigHex: "91f3cd..." 
 * }
 */
KJUR.jws.JWS.parse = function(sJWS) {
    var a = sJWS.split(".");
    var result = {};
    var uHeader, uPayload, uSig;
    if (a.length != 2 && a.length != 3)
	throw "malformed sJWS: wrong number of '.' splitted elements";

    uHeader = a[0];
    uPayload = a[1];
    if (a.length == 3) uSig = a[2]; 

    result.headerObj = KJUR.jws.JWS.readSafeJSONString(b64utoutf8(uHeader));
    result.payloadObj = KJUR.jws.JWS.readSafeJSONString(b64utoutf8(uPayload));

    result.headerPP = JSON.stringify(result.headerObj, null, "  ");
    if (result.payloadObj == null) {
	result.payloadPP = b64utoutf8(uPayload);
    } else {
	result.payloadPP = JSON.stringify(result.payloadObj, null, "  ");
    }

    if (uSig !== undefined) {
	result.sigHex = b64utohex(uSig);
    }

    return result;
};

/**
 * @name verifyJWT
 * @memberOf KJUR.jws.JWS
 * @function
 * @static
 * @param {String} sJWT string of JSON Web Token(JWT) to verify
 * @param {Object} key string of public key, certificate or key object to verify
 * @param {Array} acceptField associative array of acceptable fields (OPTION)
 * @return {Boolean} true if the JWT token is valid otherwise false
 * @since jws 3.2.3 jsrsasign 4.8.0
 *
 * @description
 * This method verifies a
 * <a href="https://tools.ietf.org/html/rfc7519">RFC 7519</a> 
 * JSON Web Token(JWT).
 * It will verify following:
 * <ul>
 * <li>Header.alg
 * <ul>
 * <li>alg is specified in JWT header.</li>
 * <li>alg is included in acceptField.alg array. (MANDATORY)</li>
 * <li>alg is proper for key.</li>
 * </ul>
 * </li>
 * <li>Payload.iss (issuer) - Payload.iss is included in acceptField.iss array if specified. (OPTION)</li>
 * <li>Payload.sub (subject) - Payload.sub is included in acceptField.sub array if specified. (OPTION)</li>
 * <li>Payload.aud (audience) - Payload.aud is included in acceptField.aud array or 
 *     the same as value if specified. (OPTION)</li>
 * <li>Time validity
 * <ul>
 * <li>
 * If acceptField.verifyAt as number of UNIX origin time is specifed for validation time, 
 * this method will verify at the time for it, otherwise current time will be used to verify.
 * </li>
 * <li>
 * Clock of JWT generator or verifier can be fast or slow. If these clocks are
 * very different, JWT validation may fail. To avoid such case, 'jsrsasign' supports
 * 'acceptField.gracePeriod' parameter which specifies acceptable time difference
 * of those clocks in seconds. So if you want to accept slow or fast in 2 hours,
 * you can specify <code>acceptField.gracePeriod = 2 * 60 * 60;</code>.
 * "gracePeriod" is zero by default.
 * "gracePeriod" is supported since jsrsasign 5.0.12.
 * </li>
 * <li>Payload.exp (expire) - Validation time is smaller than Payload.exp + gracePeriod.</li>
 * <li>Payload.nbf (not before) - Validation time is greater than Payload.nbf - gracePeriod.</li>
 * <li>Payload.iat (issued at) - Validation time is greater than Payload.iat - gracePeriod.</li>
 * </ul>
 * </li>
 * <li>Payload.jti (JWT id) - Payload.jti is included in acceptField.jti if specified. (OPTION)</li>
 * <li>JWS signature of JWS is valid for specified key.</li>
 * </ul>
 *
 * <h4>acceptField parameters</h4>
 * Here is available acceptField argument parameters:
 * <ul>
 * <li>alg - array of acceptable signature algorithm names (ex. ["HS256", "HS384"])</li>
 * <li>iss - array of acceptable issuer names (ex. ['http://foo.com'])</li>
 * <li>sub - array of acceptable subject names (ex. ['mailto:john@foo.com'])</li>
 * <li>aud - array of acceptable audience name (ex. ['http://foo.com'])</li>
 * <li>jti - string of acceptable JWT ID (OPTION) (ex. 'id1234')</li>
 * <li>
 * verifyAt - time to verify 'nbf', 'iat' and 'exp' in UNIX seconds 
 * (OPTION) (ex. 1377663900).  
 * If this is not specified, current time of verifier will be used. 
 * {@link KJUR.jws.IntDate} may be useful to specify it.
 * </li>
 * <li>gracePeriod - acceptable time difference between signer and verifier
 * in seconds (ex. 3600). If this is not specified, zero will be used.</li>
 * </ul>
 *
 * @example
 * // simple validation for HS256
 * isValid = KJUR.jws.JWS.verifyJWT("eyJhbG...", "616161", {alg: ["HS256"]}),
 *
 * // full validation for RS or PS
 * pubkey = KEYUTIL.getKey('-----BEGIN CERT...');
 * isValid = KJUR.jws.JWS.verifyJWT('eyJh...', pubkey, {
 *   alg: ['RS256', 'RS512', 'PS256', 'PS512'],
 *   iss: ['http://foo.com'],
 *   sub: ['mailto:john@foo.com', 'mailto:alice@foo.com'],
 *   verifyAt: KJUR.jws.IntDate.get('20150520235959Z'),
 *   aud: ['http://foo.com'], // aud: 'http://foo.com' is fine too.
 *   jti: 'id123456',
 *   gracePeriod: 1 * 60 * 60 // accept 1 hour slow or fast
 * });
 */
KJUR.jws.JWS.verifyJWT = function(sJWT, key, acceptField) {
    var _KJUR = KJUR,
	_KJUR_jws = _KJUR.jws,
	_KJUR_jws_JWS = _KJUR_jws.JWS,
	_readSafeJSONString = _KJUR_jws_JWS.readSafeJSONString,
	_inArray = _KJUR_jws_JWS.inArray,
	_includedArray = _KJUR_jws_JWS.includedArray;

    // 1. parse JWT
    var a = sJWT.split(".");
    var uHeader = a[0];
    var uPayload = a[1];
    var uSignatureInput = uHeader + "." + uPayload;
    var hSig = b64utohex(a[2]);

    // 2. parse JWS header
    var pHeader = _readSafeJSONString(b64utoutf8(uHeader));

    // 3. parse JWS payload
    var pPayload = _readSafeJSONString(b64utoutf8(uPayload));

    // 4. algorithm ('alg' in header) check
    if (pHeader.alg === undefined) return false;
    if (acceptField.alg === undefined)
	throw "acceptField.alg shall be specified";
    if (! _inArray(pHeader.alg, acceptField.alg)) return false;

    // 5. issuer ('iss' in payload) check
    if (pPayload.iss !== undefined && typeof acceptField.iss === "object") {
	if (! _inArray(pPayload.iss, acceptField.iss)) return false;
    }

    // 6. subject ('sub' in payload) check
    if (pPayload.sub !== undefined && typeof acceptField.sub === "object") {
	if (! _inArray(pPayload.sub, acceptField.sub)) return false;
    }

    // 7. audience ('aud' in payload) check
    if (pPayload.aud !== undefined && typeof acceptField.aud === "object") {
	if (typeof pPayload.aud == "string") {
	    if (! _inArray(pPayload.aud, acceptField.aud))
		return false;
	} else if (typeof pPayload.aud == "object") {
	    if (! _includedArray(pPayload.aud, acceptField.aud))
		return false;
	}
    }

    // 8. time validity 
    //   (nbf - gracePeriod < now < exp + gracePeriod) && (iat - gracePeriod < now)
    var now = _KJUR_jws.IntDate.getNow();
    if (acceptField.verifyAt !== undefined && typeof acceptField.verifyAt === "number") {
	now = acceptField.verifyAt;
    }
    if (acceptField.gracePeriod === undefined || 
        typeof acceptField.gracePeriod !== "number") {
	acceptField.gracePeriod = 0;
    }

    // 8.1 expired time 'exp' check
    if (pPayload.exp !== undefined && typeof pPayload.exp == "number") {
	if (pPayload.exp + acceptField.gracePeriod < now) return false;
    }

    // 8.2 not before time 'nbf' check
    if (pPayload.nbf !== undefined && typeof pPayload.nbf == "number") {
	if (now < pPayload.nbf - acceptField.gracePeriod) return false;
    }
    
    // 8.3 issued at time 'iat' check
    if (pPayload.iat !== undefined && typeof pPayload.iat == "number") {
	if (now < pPayload.iat - acceptField.gracePeriod) return false;
    }

    // 9 JWT id 'jti' check
    if (pPayload.jti !== undefined && acceptField.jti !== undefined) {
      if (pPayload.jti !== acceptField.jti) return false;
    }

    // 10 JWS signature check
    if (! _KJUR_jws_JWS.verify(sJWT, key, acceptField.alg)) return false;

    // 11 passed all check
    return true;
};

/**
 * check whether array is included by another array
 * @name includedArray
 * @memberOf KJUR.jws.JWS
 * @function
 * @static
 * @param {Array} a1 check whether set a1 is included by a2
 * @param {Array} a2 check whether set a1 is included by a2
 * @return {Boolean} check whether set a1 is included by a2
 * @since jws 3.2.3
 * This method verifies whether an array is included by another array.
 * It doesn't care about item ordering in a array.
 * @example
 * KJUR.jws.JWS.includedArray(['b'], ['b', 'c', 'a']) => true
 * KJUR.jws.JWS.includedArray(['a', 'b'], ['b', 'c', 'a']) => true
 * KJUR.jws.JWS.includedArray(['a', 'b'], ['b', 'c']) => false
 */
KJUR.jws.JWS.includedArray = function(a1, a2) {
    var _inArray = KJUR.jws.JWS.inArray;
    if (a1 === null) return false;
    if (typeof a1 !== "object") return false;
    if (typeof a1.length !== "number") return false;

    for (var i = 0; i < a1.length; i++) {
	if (! _inArray(a1[i], a2)) return false;
    }
    return true;
};

/**
 * check whether item is included by array
 * @name inArray
 * @memberOf KJUR.jws.JWS
 * @function
 * @static
 * @param {String} item check whether item is included by array
 * @param {Array} a check whether item is included by array
 * @return {Boolean} check whether item is included by array
 * @since jws 3.2.3
 * This method verifies whether an item is included by an array.
 * It doesn't care about item ordering in an array.
 * @example
 * KJUR.jws.JWS.inArray('b', ['b', 'c', 'a']) => true
 * KJUR.jws.JWS.inArray('a', ['b', 'c', 'a']) => true
 * KJUR.jws.JWS.inArray('a', ['b', 'c']) => false
 */
KJUR.jws.JWS.inArray = function(item, a) {
    if (a === null) return false;
    if (typeof a !== "object") return false;
    if (typeof a.length !== "number") return false;
    for (var i = 0; i < a.length; i++) {
	if (a[i] == item) return true;
    }
    return false;
};

/**
 * static associative array of general signature algorithm name from JWS algorithm name
 * @since jws 3.0.0
 */
KJUR.jws.JWS.jwsalg2sigalg = {
    "HS256":	"HmacSHA256",
    "HS384":	"HmacSHA384",
    "HS512":	"HmacSHA512",
    "RS256":	"SHA256withRSA",
    "RS384":	"SHA384withRSA",
    "RS512":	"SHA512withRSA",
    "ES256":	"SHA256withECDSA",
    "ES384":	"SHA384withECDSA",
    //"ES512":	"SHA512withECDSA", // unsupported because of jsrsasign's bug
    "PS256":	"SHA256withRSAandMGF1",
    "PS384":	"SHA384withRSAandMGF1",
    "PS512":	"SHA512withRSAandMGF1",
    "none":	"none",
};

// === utility static method ==================================================

/**
 * check whether a String "s" is a safe JSON string or not.<br/>
 * If a String "s" is a malformed JSON string or an other object type
 * this returns 0, otherwise this returns 1.
 * @name isSafeJSONString
 * @memberOf KJUR.jws.JWS
 * @function
 * @static
 * @param {String} s JSON string
 * @return {Number} 1 or 0
 */
KJUR.jws.JWS.isSafeJSONString = function(s, h, p) {
    var o = null;
    try {
	o = jsonParse(s);
	if (typeof o != "object") return 0;
	if (o.constructor === Array) return 0;
	if (h) h[p] = o;
	return 1;
    } catch (ex) {
	return 0;
    }
};

/**
 * read a String "s" as JSON object if it is safe.<br/>
 * If a String "s" is a malformed JSON string or not JSON string,
 * this returns null, otherwise returns JSON object.
 * @name readSafeJSONString
 * @memberOf KJUR.jws.JWS
 * @function
 * @static
 * @param {String} s JSON string
 * @return {Object} JSON object or null
 * @since 1.1.1
 */
KJUR.jws.JWS.readSafeJSONString = function(s) {
    var o = null;
    try {
	o = jsonParse(s);
	if (typeof o != "object") return null;
	if (o.constructor === Array) return null;
	return o;
    } catch (ex) {
	return null;
    }
};

/**
 * get Encoed Signature Value from JWS string.<br/>
 * @name getEncodedSignatureValueFromJWS
 * @memberOf KJUR.jws.JWS
 * @function
 * @static
 * @param {String} sJWS JWS signature string to be verified
 * @return {String} string of Encoded Signature Value 
 * @throws if sJWS is not comma separated string such like "Header.Payload.Signature".
 */
KJUR.jws.JWS.getEncodedSignatureValueFromJWS = function(sJWS) {
    var matchResult = sJWS.match(/^[^.]+\.[^.]+\.([^.]+)$/);
    if (matchResult == null) {
	throw "JWS signature is not a form of 'Head.Payload.SigValue'.";
    }
    return matchResult[1];
};

/**
 * get RFC 7638 JWK thumbprint from JWK object
 * @name getJWKthumbprint
 * @memberOf KJUR.jws.JWS
 * @function
 * @static
 * @param {Object} o JWK object to be calculated thumbprint
 * @return {String} Base64 URL encoded JWK thumbprint value
 * @since jsrsasign 5.0.2 jws 3.3.2
 * @description
 * This method calculates JWK thmubprint for specified JWK object
 * as described in 
 * <a href="https://tools.ietf.org/html/rfc7638">RFC 7638</a>.
 * It supports all type of "kty". (i.e. "RSA", "EC" and "oct"
 * (for symmetric key))
 * Working sample is 
 * <a href="https://kjur.github.io/jsrsasign/sample/tool_jwktp.html">here</a>.
 * @example
 * jwk = {"kty":"RSA", "n":"0vx...", "e":"AQAB", ...};
 * thumbprint = KJUR.jws.JWS.getJWKthumbprint(jwk);
 */
KJUR.jws.JWS.getJWKthumbprint = function(o) {
    if (o.kty !== "RSA" &&
	o.kty !== "EC" &&
	o.kty !== "oct")
	throw "unsupported algorithm for JWK Thumprint";

    // 1. get canonically ordered json string
    var s = '{';
    if (o.kty === "RSA") {
	if (typeof o.n != "string" || typeof o.e != "string")
	    throw "wrong n and e value for RSA key";
	s += '"' + 'e' + '":"' + o.e + '",';
	s += '"' + 'kty' + '":"' + o.kty + '",';
	s += '"' + 'n' + '":"' + o.n + '"}';
    } else if (o.kty === "EC") {
	if (typeof o.crv != "string" || 
	    typeof o.x != "string" ||
	    typeof o.y != "string")
	    throw "wrong crv, x and y value for EC key";
	s += '"' + 'crv' + '":"' + o.crv + '",';
	s += '"' + 'kty' + '":"' + o.kty + '",';
	s += '"' + 'x' + '":"' + o.x + '",';
	s += '"' + 'y' + '":"' + o.y + '"}';
    } else if (o.kty === "oct") {
	if (typeof o.k != "string")
	    throw "wrong k value for oct(symmetric) key";
	s += '"' + 'kty' + '":"' + o.kty + '",';
	s += '"' + 'k' + '":"' + o.k + '"}';
    }
    //alert(s);

    // 2. get thumb print
    var hJWK = rstrtohex(s);
    var hash = KJUR.crypto.Util.hashHex(hJWK, "sha256");
    var hashB64U = hextob64u(hash);

    return hashB64U;
};

/**
 * IntDate class for time representation for JSON Web Token(JWT)
 * @class KJUR.jws.IntDate class
 * @name KJUR.jws.IntDate
 * @since jws 3.0.1
 * @description
 * Utility class for IntDate which is integer representation of UNIX origin time
 * used in JSON Web Token(JWT).
 */
KJUR.jws.IntDate = {};

/**
 * get UNIX origin time from by string
 * @name get
 * @memberOf KJUR.jws.IntDate
 * @function
 * @static
 * @param {String} s string of time representation
 * @return {Integer} UNIX origin time in seconds for argument 's'
 * @since jws 3.0.1
 * @throws "unsupported format: s" when malformed format
 * @description
 * This method will accept following representation of time.
 * <ul>
 * <li>now - current time</li>
 * <li>now + 1hour - after 1 hour from now</li>
 * <li>now + 1day - after 1 day from now</li>
 * <li>now + 1month - after 30 days from now</li>
 * <li>now + 1year - after 365 days from now</li>
 * <li>YYYYmmDDHHMMSSZ - UTC time (ex. 20130828235959Z)</li>
 * <li>number - UNIX origin time (seconds from 1970-01-01 00:00:00) (ex. 1377714748)</li>
 * </ul>
 */
KJUR.jws.IntDate.get = function(s) {
    var _KJUR_jws_IntDate = KJUR.jws.IntDate,
	_getNow = _KJUR_jws_IntDate.getNow,
	_getZulu = _KJUR_jws_IntDate.getZulu;

    if (s == "now") {
	return _getNow();
    } else if (s == "now + 1hour") {
	return _getNow() + 60 * 60;
    } else if (s == "now + 1day") {
	return _getNow() + 60 * 60 * 24;
    } else if (s == "now + 1month") {
	return _getNow() + 60 * 60 * 24 * 30;
    } else if (s == "now + 1year") {
	return _getNow() + 60 * 60 * 24 * 365;
    } else if (s.match(/Z$/)) {
	return _getZulu(s);
    } else if (s.match(/^[0-9]+$/)) {
	return parseInt(s);
    }
    throw "unsupported format: " + s;
};

/**
 * get UNIX origin time from Zulu time representation string
 * @name getZulu
 * @memberOf KJUR.jws.IntDate
 * @function
 * @static
 * @param {String} s string of Zulu time representation (ex. 20151012125959Z)
 * @return {Integer} UNIX origin time in seconds for argument 's'
 * @since jws 3.0.1
 * @throws "unsupported format: s" when malformed format
 * @description
 * This method provides UNIX origin time from Zulu time.
 * Following representations are supported:
 * <ul>
 * <li>YYYYMMDDHHmmSSZ - GeneralizedTime format</li>
 * <li>YYMMDDHHmmSSZ - UTCTime format. If YY is greater or equal to 
 * 50 then it represents 19YY otherwise 20YY.</li>
 * </ul>
 * @example
 * KJUR.jws.IntDate.getZulu("20151012125959Z") => 1478...
 * KJUR.jws.IntDate.getZulu("151012125959Z") => 1478...
 */
KJUR.jws.IntDate.getZulu = function(s) {
    return zulutosec(s);
};

/**
 * get UNIX origin time of current time
 * @name getNow
 * @memberOf KJUR.jws.IntDate
 * @function
 * @static
 * @return {Integer} UNIX origin time for current time
 * @since jws 3.0.1
 * @description
 * This method provides UNIX origin time for current time
 * @example
 * KJUR.jws.IntDate.getNow() => 1478...
 */
KJUR.jws.IntDate.getNow = function() {
    var d = ~~(new Date() / 1000);
    return d;
};

/**
 * get UTC time string from UNIX origin time value
 * @name intDate2UTCString
 * @memberOf KJUR.jws.IntDate
 * @function
 * @static
 * @param {Integer} intDate UNIX origin time value (ex. 1478...)
 * @return {String} UTC time string
 * @since jws 3.0.1
 * @description
 * This method provides UTC time string for UNIX origin time value.
 * @example
 * KJUR.jws.IntDate.intDate2UTCString(1478...) => "2015 Oct ..."
 */
KJUR.jws.IntDate.intDate2UTCString = function(intDate) {
    var d = new Date(intDate * 1000);
    return d.toUTCString();
};

/**
 * get UTC time string from UNIX origin time value
 * @name intDate2Zulu
 * @memberOf KJUR.jws.IntDate
 * @function
 * @static
 * @param {Integer} intDate UNIX origin time value (ex. 1478...)
 * @return {String} Zulu time string
 * @since jws 3.0.1
 * @description
 * This method provides Zulu time string for UNIX origin time value.
 * @example
 * KJUR.jws.IntDate.intDate2UTCString(1478...) => "20151012...Z"
 */
KJUR.jws.IntDate.intDate2Zulu = function(intDate) {
    var d = new Date(intDate * 1000),
	year = ("0000" + d.getUTCFullYear()).slice(-4),
	mon =  ("00" + (d.getUTCMonth() + 1)).slice(-2),
	day =  ("00" + d.getUTCDate()).slice(-2),
	hour = ("00" + d.getUTCHours()).slice(-2),
	min =  ("00" + d.getUTCMinutes()).slice(-2),
        sec =  ("00" + d.getUTCSeconds()).slice(-2);
    return year + mon + day + hour + min + sec + "Z";
};

/* jwsjs-2.2.1 (c) 2010-2018 Kenji Urushima | kjur.github.com/jsrsasign/license
 */
/*
 * jwsjs.js - JSON Web Signature JSON Serialization (JWSJS) Class
 *
 * Copyright (c) 2010-2018 Kenji Urushima (kenji.urushima@gmail.com)
 *
 * This software is licensed under the terms of the MIT License.
 * https://kjur.github.io/jsrsasign/license/
 *
 * The above copyright and license notice shall be 
 * included in all copies or substantial portions of the Software.
 */

/**
 * @fileOverview
 * @name jwsjs-2.0.js
 * @author Kenji Urushima kenji.urushima@gmail.com
 * @version jsrsasign 8.0.0 jwsjs 2.2.1 (2018-Mar-24)
 * @since jsjws 1.2, jsrsasign 4.8.0
 * @license <a href="https://kjur.github.io/jsrsasign/license/">MIT License</a>
 */

if (typeof KJUR == "undefined" || !KJUR) KJUR = {};
if (typeof KJUR.jws == "undefined" || !KJUR.jws) KJUR.jws = {};

/**
 * JSON Web Signature JSON Serialization (JWSJS) class.<br/>
 * @class JSON Web Signature JSON Serialization (JWSJS) class
 * @name KJUR.jws.JWSJS
 * @property {array of String} aHeader array of Encoded JWS Headers
 * @property {String} sPayload Encoded JWS payload
 * @property {array of String} aSignature array of Encoded JWS signature value
 * @author Kenji Urushima
 * @version 2.1.0 (2016 Sep 6)
 * @see <a href="https://kjur.github.io/jsjws/">old jwjws home page https://kjur.github.io/jsjws/</a>
 * @see <a href="https://kjur.github.io/jsrsasigns/">'jwrsasign'(RSA Sign JavaScript Library) home page https://kjur.github.io/jsrsasign/</a>
 * @see <a href="http://tools.ietf.org/html/draft-jones-json-web-signature-json-serialization-01">IETF I-D JSON Web Signature JSON Serialization (JWS-JS) specification</a>
 *
 * @description
 * This class generates and verfies "JSON Web Signature JSON Serialization (JWSJS)" of
 * <a href="http://tools.ietf.org/html/draft-jones-json-web-signature-json-serialization-01">
 * IETF Internet Draft</a>. Here is major methods of this class:
 * <ul>
 * <li>{@link KJUR.jws.JWSJS#readJWSJS} - initialize with string or JSON object of JWSJS.</li>
 * <li>{@link KJUR.jws.JWSJS#initWithJWS} - initialize with JWS as first signature.</li>
 * <li>{@link KJUR.jws.JWSJS#addSignature} - append signature to JWSJS object.</li>
 * <li>{@link KJUR.jws.JWSJS#verifyAll} - verify all signatures in JWSJS object.</li>
 * <li>{@link KJUR.jws.JWSJS#getJSON} - get result of JWSJS object as JSON object.</li>
 * </ul>
 *
 * @example
 * // initialize
 * jwsjs1 = new KJUR.jws.JWSJS();
 * jwsjs1.readJWSJS("{headers: [...], payload: "eyJ...", signatures: [...]}");
 * 
 * // add PS256 signature with RSA private key object
 * prvKeyObj = KEYUTIL.getKey("-----BEGIN PRIVATE KEY...");
 * jwsjs1.addSignature("PS256", {alg: "PS256"}, prvKeyObj);
 * // add HS256 signature with HMAC password "secret"
 * jwsjs1.addSignature(null, {alg: "HS256"}, {utf8: "secret"});
 * 
 * // get result finally
 * jwsjsObj1 = jwsjs1.getJSON();
 *
 * // verify all signatures
 * isValid = jwsjs1.verifyAll([["-----BEGIN CERT...", ["RS256"]],
 *                             [{utf8: "secret"}, ["HS256"]]]); 
 * 
 */
KJUR.jws.JWSJS = function() {
    var _KJUR = KJUR,
	_KJUR_jws = _KJUR.jws,
	_KJUR_jws_JWS = _KJUR_jws.JWS,
	_readSafeJSONString = _KJUR_jws_JWS.readSafeJSONString;

    this.aHeader = [];
    this.sPayload = "";
    this.aSignature = [];

    // == initialize ==========================================================
    /**
     * (re-)initialize this object.<br/>
     * @name init
     * @memberOf KJUR.jws.JWSJS#
     * @function
     */
    this.init = function() {
	this.aHeader = [];
	this.sPayload = undefined;
	this.aSignature = [];
    };

    /**
     * (re-)initialize and set first signature with JWS.<br/>
     * @name initWithJWS
     * @memberOf KJUR.jws.JWSJS#
     * @param {String} sJWS JWS signature to set
     * @function
     * @example
     * jwsjs1 = new KJUR.jws.JWSJWS();
     * jwsjs1.initWithJWS("eyJ...");
     */
    this.initWithJWS = function(sJWS) {
	this.init();

	var a = sJWS.split(".");
	if (a.length != 3)
	    throw "malformed input JWS";

	this.aHeader.push(a[0]);
	this.sPayload = a[1];
	this.aSignature.push(a[2]);
    };

    // == add signature =======================================================
    /**
     * add a signature to existing JWS-JS by algorithm, header and key.<br/>
     * @name addSignature
     * @memberOf KJUR.jws.JWSJS#
     * @function
     * @param {String} alg JWS algorithm. If null, alg in header will be used.
     * @param {Object} spHead string or object of JWS Header to add.
     * @param {Object} key JWS key to sign. key object, PEM private key or HMAC key
     * @param {String} pass optional password for encrypted PEM private key
     * @throw if signature append failed.
     * @example
     * // initialize
     * jwsjs1 = new KJUR.jws.JWSJS();
     * jwsjs1.readJWSJS("{headers: [...], payload: "eyJ...", signatures: [...]}");
     *
     * // add PS256 signature with RSA private key object
     * prvKeyObj = KEYUTIL.getKey("-----BEGIN PRIVATE KEY...");
     * jwsjs1.addSignature("PS256", {alg: "PS256"}, prvKeyObj);
     *
     * // add HS256 signature with HMAC password "secret"
     * jwsjs1.addSignature(null, {alg: "HS256"}, {utf8: "secret"});
     *
     * // get result finally
     * jwsjsObj1 = jwsjs1.getJSON();
     */
    this.addSignature = function(alg, spHead, key, pass) {
	if (this.sPayload === undefined || this.sPayload === null)
	    throw "there's no JSON-JS signature to add.";

	var sigLen = this.aHeader.length;
	if (this.aHeader.length != this.aSignature.length)
	    throw "aHeader.length != aSignature.length";

	try {
	    var sJWS = KJUR.jws.JWS.sign(alg, spHead, this.sPayload, key, pass);
	    var a = sJWS.split(".");
	    var sHeader2 = a[0];
	    var sSignature2 = a[2];
	    this.aHeader.push(a[0]);
	    this.aSignature.push(a[2]);
	} catch(ex) {
	    if (this.aHeader.length > sigLen) this.aHeader.pop();
	    if (this.aSignature.length > sigLen) this.aSignature.pop();
	    throw "addSignature failed: " + ex;
	}
    };

    // == verify signature ====================================================
    /**
     * verify all signature of JWS-JS object by array of key and acceptAlgs.<br/>
     * @name verifyAll
     * @memberOf KJUR.jws.JWSJS#
     * @function
     * @param {array of key and acceptAlgs} aKeyAlg a array of key and acceptAlgs
     * @return true if all signatures are valid otherwise false
     * @since jwsjs 2.1.0 jsrsasign 5.1.0
     * @example
     * jwsjs1 = new KJUR.jws.JWSJS();
     * jwsjs1.readJWSJS("{headers: [...], payload: "eyJ...", signatures: [...]}");
     * isValid = jwsjs1.verifyAll([["-----BEGIN CERT...", ["RS256"]],
     *                             [{utf8: "secret"}, ["HS256"]]]); 
     */
    this.verifyAll = function(aKeyAlg) {
	if (this.aHeader.length !== aKeyAlg.length ||
	    this.aSignature.length !== aKeyAlg.length)
	    return false;

	for (var i = 0; i < aKeyAlg.length; i++) {
	    var keyAlg = aKeyAlg[i];
	    if (keyAlg.length  !== 2) return false;
	    var result = this.verifyNth(i, keyAlg[0], keyAlg[1]);
	    if (result === false) return false;
	}
	return true;
    };

    /**
     * verify Nth signature of JWS-JS object by key and acceptAlgs.<br/>
     * @name verifyNth
     * @memberOf KJUR.jws.JWSJS#
     * @function
     * @param {Integer} idx nth index of JWS-JS signature to verify
     * @param {Object} key key to verify
     * @param {array of String} acceptAlgs array of acceptable signature algorithms
     * @return true if signature is valid otherwise false
     * @since jwsjs 2.1.0 jsrsasign 5.1.0
     * @example
     * jwsjs1 = new KJUR.jws.JWSJS();
     * jwsjs1.readJWSJS("{headers: [...], payload: "eyJ...", signatures: [...]}");
     * isValid1 = jwsjs1.verifyNth(0, "-----BEGIN CERT...", ["RS256"]);
     * isValid2 = jwsjs1.verifyNth(1, {utf8: "secret"}, ["HS256"]);
     */
    this.verifyNth = function(idx, key, acceptAlgs) {
	if (this.aHeader.length <= idx || this.aSignature.length <= idx)
	    return false;
	var sHeader = this.aHeader[idx];
	var sSignature = this.aSignature[idx];
	var sJWS = sHeader + "." + this.sPayload + "." + sSignature;
	var result = false;
	try {
	    result = _KJUR_jws_JWS.verify(sJWS, key, acceptAlgs);
	} catch (ex) {
	    return false;
	}
	return result;
    };

    /**
     * read JWS-JS string or object<br/>
     * @name readJWSJS
     * @memberOf KJUR.jws.JWSJS#
     * @function
     * @param {Object} spJWSJS string or JSON object of JWS-JS to load.
     * @throw if sJWSJS is malformed or not JSON string.
     * @description
     * NOTE: Loading from JSON object is suppored from 
     * jsjws 2.1.0 jsrsasign 5.1.0 (2016-Sep-06).
     * @example
     * // load JWSJS from string
     * jwsjs1 = new KJUR.jws.JWSJS();
     * jwsjs1.readJWSJS("{headers: [...], payload: "eyJ...", signatures: [...]}");
     *
     * // load JWSJS from JSON object
     * jwsjs1 = new KJUR.jws.JWSJS();
     * jwsjs1.readJWSJS({headers: [...], payload: "eyJ...", signatures: [...]});
     */
    this.readJWSJS = function(spJWSJS) {
	if (typeof spJWSJS === "string") {
	    var oJWSJS = _readSafeJSONString(spJWSJS);
	    if (oJWSJS == null) throw "argument is not safe JSON object string";

	    this.aHeader = oJWSJS.headers;
	    this.sPayload = oJWSJS.payload;
	    this.aSignature = oJWSJS.signatures;
	} else {
	    try {
		if (spJWSJS.headers.length > 0) {
		    this.aHeader = spJWSJS.headers;
		} else {
		    throw "malformed header";
		}
		if (typeof spJWSJS.payload === "string") {
		    this.sPayload = spJWSJS.payload;
		} else {
		    throw "malformed signatures";
		}
		if (spJWSJS.signatures.length > 0) {
		    this.aSignatures = spJWSJS.signatures;
		} else {
		    throw "malformed signatures";
		}
	    } catch (ex) {
		throw "malformed JWS-JS JSON object: " + ex;
	    }
	}
    };

    // == utility =============================================================
    /**
     * get JSON object for this JWS-JS object.<br/>
     * @name getJSON
     * @memberOf KJUR.jws.JWSJS#
     * @function
     * @example
     * jwsj1 = new KJUR.jws.JWSJS();
     * // do some jwsj1 operation then get result by getJSON()
     * jwsjsObj1 = jwsjs1.getJSON();
     * // jwsjsObj1 &rarr; { headers: [...], payload: "ey...", signatures: [...] }
     */
    this.getJSON = function() {
	return { "headers": this.aHeader,
		 "payload": this.sPayload,
		 "signatures": this.aSignature }; 
    };

    /**
     * check if this JWS-JS object is empty.<br/>
     * @name isEmpty
     * @memberOf KJUR.jws.JWSJS#
     * @function
     * @return 1 if there is no signatures in this object, otherwise 0.
     */
    this.isEmpty = function() {
	if (this.aHeader.length == 0) return 1; 
	return 0;
    };
};

