/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { ObjectManipulator } from "./util/ObjectManipulator.js";
import { FileLoadingExecutor } from "./util/FileLoadingExecutor.js";

export {
	AutoAssetLoader,
	AssetTask,
	ResourceDescriptor
}


/**
 *
 * @constructor
 */
const AutoAssetLoader = function () {
	this.assetTasks = new Map();
	this.baseObject3d;
};
AutoAssetLoader.AUTO_ASSET_LOADER_VERSION = '1.0.0-alpha';

AutoAssetLoader.prototype = {

	constructor: AutoAssetLoader,

	/**
	 *
	 * @returns {AutoAssetLoader}
	 */
	printVersion: function() {
		console.info( 'Using AutoAssetLoader version: ' + Director.AUTO_ASSET_LOADER_VERSION );
		return this;
	},

	/**
	 *
	 * @param {AssetTask} assetTask
	 * @returns {AutoAssetLoader}
	 */
	addAssetTask: function ( assetTask ) {
		this.assetTasks.set( assetTask.getName(), assetTask );
		return this;
	},

	setBaseObject3d: function ( baseObject3d ) {
		this.baseObject3d = baseObject3d;
	},

	/**
	 *
	 * @returns {AutoAssetLoader}
	 */
	run: function () {
		this._initAssetTasks();

		this._loadResources()
			.then( x => processAssets( x ) )
			.catch( x => console.error( x ) );

		let scope = this;
		function processAssets( loadResults ) {
			console.log( 'Count of loaded resources: ' + loadResults.length );

			let assetTask;
			for ( assetTask of scope.assetTasks.values() ) {
				assetTask.process();
			}

			scope.baseObject3d.add( assetTask.processResult );
		}

		return this;
	},

	_initAssetTasks: function () {
		let assetTaskBefore = null;
		this.assetTasks.forEach( function ( assetTask, key ) {
			if ( assetTaskBefore !== null ) {

				assetTask.setTaskBefore( assetTaskBefore );
				assetTaskBefore.setTaskAfter( assetTask )

			}
			assetTaskBefore = assetTask;

			assetTask.init();
		} );
	},

	_loadResources: async function () {
		let loadPromises = [ this.assetTasks.size ];
		let index = 0;
		for ( let assetTask of this.assetTasks.values() ) {
			if ( assetTask.getResourceDescriptor() ) {

				loadPromises[ index ] = await assetTask.loadResource( assetTask.getName() );
				index ++;

			}
		}

		console.log( 'Waiting for completion of loading of all assets!');
		return await Promise.all( loadPromises );
	}

};


/**
 *
 * @param {String} name
 * @constructor
 */
const AssetTask = function ( name ) {
	this.name = name;
	this.resourceDescriptor;
	this.assetHandler = {
		ref: null,
		instance: null,
		config: {},
		processFunctionName: 'parse'
	};
	this.relations = {
		before: null,
		after: null
	};
	this.linker = false;
	this.processResult;
};

AssetTask.prototype = {

	constructor: AssetTask,

	/**
	 *
	 * @returns {String}
	 */
	getName: function () {
		return this.name;
	},

	/**
	 * Change the name of the process function of the assetHandler instance. Default is "parse".
	 *
	 * @param {String} processFunctionName
	 * @returns {AssetTask}
	 */
	setProcessFunctionName: function ( processFunctionName ) {
		this.assetHandler.processFunctionName = processFunctionName;
		return this;
	},

	/**
	 *
	 * @param {ResourceDescriptor} resourceDescriptor
	 * @returns {AssetTask}
	 */
	setResourceDescriptor: function ( resourceDescriptor ) {
		this.resourceDescriptor = resourceDescriptor;
		return this;
	},

	/**
	 *
	 * @returns {ResourceDescriptor}
	 */
	getResourceDescriptor: function () {
		return this.resourceDescriptor;
	},


	setTaskBefore: function ( assetTask ) {
		this.relations.before = assetTask;
	},

	setTaskAfter: function ( assetTask ) {
		this.relations.after = assetTask;
	},

	setLinker: function ( linker ) {
		this.linker = linker;
		this.setProcessFunctionName( 'link' );
	},

	isLinker: function () {
		return this.linker;
	},

	getProcessResult: function () {
		return this.processResult;
	},

	/**
	 *
	 * @param {Object} assetHandlerRef
	 * @param {Object} [loaderConfig]
	 * @returns {AssetTask}
	 */
	setAssetHandlerRef: function ( assetHandlerRef, assetHandlerConfig ) {
		this.assetHandler.ref = assetHandlerRef;
		if ( assetHandlerConfig !== undefined && assetHandlerConfig !== null ) {
			this.assetHandler.config = assetHandlerConfig;
		}
		return this;
	},

	setAssetHandler: function ( assetHandler ) {
		if ( assetHandler ) {

			this.assetHandler.instance = assetHandler;

		}
		return this;
	},

	/**
	 *
	 */
	init: function () {
		console.log( this.name + ': Performing init' );
		if ( this.assetHandler.instance === null && this.assetHandler.ref !== null ) {

			this.assetHandler.instance = Object.create( this.assetHandler.ref.prototype );
			this.assetHandler.ref.call( this.assetHandler.instance );
			ObjectManipulator.applyProperties( this.assetHandler.instance, this.assetHandler.config );

		}
		if ( this.assetHandler.instance !== null && typeof this.assetHandler.instance.printVersion === 'function' ) {

			this.assetHandler.instance.printVersion();

		}
	},

	loadResource: async function () {
		let response = await FileLoadingExecutor.loadFileAsync( {
			resourceDescriptor: this.getResourceDescriptor(),
			instanceNo: 0,
			description: 'loadAssets',
			reportCallback: ( report => console.log( report.detail.text ) )
		} );
		return response;
	},

	/**
	 *
	 */
	process: function () {
		if ( ! this.isLinker() ) {

			this.processResult = this.assetHandler.instance[ this.assetHandler.processFunctionName ]( this.resourceDescriptor.content.result );

		} else {

			this.processResult = this.assetHandler.instance[ this.assetHandler.processFunctionName ]( this.relations.before, this.relations.after );

		}
	}

};


/**
 *
 * @param {String} resourceType
 * @param {String} name
 * @param {Object} [input]
 * @constructor
 */
const ResourceDescriptor = function ( resourceType, name, input ) {
	this.name = ( name !== undefined && name !== null ) ? name : 'Unnamed_Resource';
	this.content = {
		data: null,
		resourceType: resourceType,
		payloadType: 'arraybuffer',
		result: null
	};
	this.url = null;
	this.filename = null;
	this.path;
	this.resourcePath;
	this.extension = null;
	this.async = {
		load: false,
		parse: true
	};
	this.dataOptions = {};
	this.transferables = [];

	this._init( input );
};

ResourceDescriptor.prototype = {

	constructor: ResourceDescriptor,

	_init: function ( input ) {
		input = ( input !== undefined && input !== null ) ? input : null;

		switch ( this.content.resourceType ) {
			case 'URL':
				this.url = ( input !== null ) ? input : this.name;
				this.url = new URL( this.url, window.location.href ).href;
				this.filename = this.url;
				let urlParts = this.url.split( '/' );
				if ( urlParts.length > 2 ) {

					this.filename = urlParts[ urlParts.length - 1 ];
					let urlPartsPath = urlParts.slice( 0, urlParts.length - 1 ).join( '/' ) + '/';
					if ( urlPartsPath !== undefined && urlPartsPath !== null ) this.path = urlPartsPath;

				}
				let filenameParts = this.filename.split( '.' );
				if ( filenameParts.length > 1 ) this.extension = filenameParts[ filenameParts.length - 1 ];
				this.content.data = null;
				break;

			case 'Buffer':
				this.setBuffer( input );
				break;

			case 'String':
				this.setString( input );
				break;

			case 'Metadata':
				this.content.data = 'no_content';
				break;

			default:
				throw 'An unsupported resourceType "' + this.resourceType + '" was provided! Aborting...';
				break;

		}
	},

	setString: function ( input ) {
		// fast-fail on unset input
		if ( input === null ) return;
		if ( ! ( typeof( input ) === 'string' || input instanceof String) ) this._throwError( 'Provided input is not of resourceType "String"! Aborting...' );
		this.content.resourceType = 'String';
		this.content.payloadType = 'string';
		this.content.data = input;
	},

	setBuffer: function ( buffer ) {
		// fast-fail on unset input
		if ( buffer === null ) return;
		if ( ! ( buffer instanceof ArrayBuffer ||
			buffer instanceof Int8Array ||
			buffer instanceof Uint8Array ||
			buffer instanceof Uint8ClampedArray ||
			buffer instanceof Int16Array ||
			buffer instanceof Uint16Array ||
			buffer instanceof Int32Array ||
			buffer instanceof Uint32Array ||
			buffer instanceof Float32Array ||
			buffer instanceof Float64Array ) ) {

			this._throwError( 'Provided input is neither an "ArrayBuffer" nor a "TypedArray"! Aborting...' );

		}
		this.content.resourceType = 'Buffer';
		this.content.payloadType = 'arraybuffer';
		this.content.data = buffer;
	},

	configureAsync: function ( loadAsync, parseAsync ) {
		this.async.parse = parseAsync === true;
		// Loading in Worker is currently only allowed when async parse is performed!!!!
		this.async.load = loadAsync === true && this.async.parse;

		return this;
	},

	setDataOption: function ( name, object, transferables ) {
		if ( ! Array.isArray( transferables ) ) transferables = [];
		this.dataOptions[ name ] = {
			name: name,
			object: object
		};
		if ( transferables.length > 0 ) {

			this.transferables = this.transferables.concat( transferables );

		}
	},

	setAssetHandlerResult: function ( result ) {
		this.content.result = result;
	},

	setCallbackOnProcessResult: function ( callbackOnProcessResult ) {
		this.callbackOnProcessResult = callbackOnProcessResult;
		return this;
	},

	getCallbackOnProcessResult: function ( ) {
		return this.callbackOnProcessResult;
	},

	createSendable: function () {
		let copy = new ResourceDescriptor( this.resourceType, this.name );
		copy.url = this.url;
		copy.filename = this.filename;
		copy.path = this.path;
		copy.resourcePath = this.resourcePath;
		copy.extension = this.extension;
		copy.async.load = this.async.load;
		copy.async.parse = this.async.parse;
		this.content.result = null;
		return copy;
	}
};
