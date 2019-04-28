/**
 * @author Kai Salmen / www.kaisalmen.de
 */

THREE.WLDRACOLoader = function ( manager ) {
	THREE.DRACOLoader.call( this, manager );
	this.builderPath = '../';
	this.callbackDataReceiver = null;
	this.resourcePath = 'js/libs/draco/';
};

THREE.WLDRACOLoader.prototype = Object.create( THREE.DRACOLoader.prototype );
THREE.WLDRACOLoader.prototype.constructor = THREE.WLDRACOLoader;

THREE.WLDRACOLoader.prototype.setBuilderPath = function ( builderPath ) {
	this.builderPath = builderPath;
};

THREE.WLDRACOLoader.prototype.setCallbackDataReceiver = function ( callbackDataReceiver ) {
	this.callbackDataReceiver = callbackDataReceiver;
};

THREE.WLDRACOLoader.prototype.setResourcePath = function ( resourcePath ) {
	this.resourcePath = resourcePath;
};

THREE.WLDRACOLoader.prototype.parse = function ( arrayBuffer, options ) {
	THREE.DRACOLoader.setDecoderPath( this.resourcePath );
	THREE.DRACOLoader.setDecoderConfig( { type: 'js' } );

	var scope = this;
	var scopedOnLoad = function ( bufferGeometry ) {
		var meshTransmitter = new THREE.MeshTransfer.MeshTransmitter();

		meshTransmitter.setCallbackDataReceiver( scope.callbackDataReceiver );
		meshTransmitter.setDefaultGeometryType( 0 );
		meshTransmitter.handleBufferGeometry( bufferGeometry, 'bunny.drc' );

		// Do not release decoder resources as it prevents re-use of Worker
//		THREE.DRACOLoader.releaseDecoderModule();
	};

	var attributeUniqueIdMap = options[ 'attributeUniqueIdMap' ];
	var attributeTypeMap = options[ 'attributeTypeMap' ];
	var value, attributeTypeMapObject, attributeUniqueIdMapObject;

	if ( attributeTypeMap ) {

		attributeTypeMapObject = attributeTypeMap.object;
		for ( var name in attributeTypeMapObject ) {

			value = attributeTypeMapObject[ name ];
			switch ( value ) {
				case 'Int8Array':
					attributeTypeMapObject[ name ] = Int8Array;
					break;
				case 'Uint8Array':
					attributeTypeMapObject[ name ] = Uint8Array;
					break;
				case 'Uint8ClampedArray':
					attributeTypeMapObject[ name ] = Uint8ClampedArray;
					break;
				case 'Int16Array':
					attributeTypeMapObject[ name ] = Int16Array;
					break;
				case 'Uint16Array':
					attributeTypeMapObject[ name ] = Uint16Array;
					break;
				case 'Int32Array':
					attributeTypeMapObject[ name ] = Int32Array;
					break;
				case 'Uint32Array':
					attributeTypeMapObject[ name ] = Uint32Array;
					break;
				case 'Float32Array':
					attributeTypeMapObject[ name ] = Float32Array;
					break;
				case 'Float64Array':
					attributeTypeMapObject[ name ] = Float64Array;
					break;
			}

		}

	}
	if ( attributeUniqueIdMap ) {

		attributeUniqueIdMapObject = attributeUniqueIdMap.object;

	}
	this.decodeDracoFile( arrayBuffer, scopedOnLoad, attributeUniqueIdMapObject, attributeTypeMapObject );

};

THREE.WLDRACOLoader.prototype.buildWorkerCode = function ( codeSerializer, scope ) {
	scope = ( scope === null || scope === undefined ) ? this : scope;
	var decodeDracoFile = function( rawBuffer, callback, attributeUniqueIdMap, attributeTypeMap ) {
		var dracoScope = this;
		var oldFashioned = function ( module ) {
			dracoScope.decodeDracoFileInternal( rawBuffer, module.decoder, callback,
				attributeUniqueIdMap || {}, attributeTypeMap || {});
		};
		THREE.DRACOLoader.getDecoderModule( oldFashioned );
	};

	var getDecoderModule = function ( callback ) {
		var config = THREE.DRACOLoader.decoderConfig;

		var dracoScope = this;
		config.onModuleLoaded = function ( decoder ) {
			dracoScope.timeLoaded = performance.now();

			console.log( "Decoder module loaded in: " + dracoScope.timeLoaded );
			// Module is Promise-like. Wrap before resolving to avoid loop.
			callback( { decoder: decoder } );
		};
		DracoDecoderModule( config );
	};

	var overrideFunctions = [];
	overrideFunctions[ 'decodeDracoFile' ] = {
		fullName: 'THREE.DRACOLoader.prototype.decodeDracoFile',
		code: decodeDracoFile.toString()
	};
	overrideFunctions[ 'getDecoderModule' ] = {
		fullName: 'THREE.DRACOLoader.getDecoderModule',
		code: getDecoderModule.toString()
	};
	var workerCode = codeSerializer.serializeClass( 'THREE.DRACOLoader', THREE.DRACOLoader, 'THREE.DRACOLoader', null, null, null, overrideFunctions );
	workerCode += codeSerializer.serializeClass( 'THREE.WLDRACOLoader', THREE.WLDRACOLoader, 'THREE.WLDRACOLoader', 'THREE.DRACOLoader', null,
		[ 'setBuilderPath', 'setResourcePath', 'setCallbackDataReceiver', 'parse' ] );
	return {
		code: workerCode,
		parserName: 'THREE.WLDRACOLoader',
		containsMeshDisassembler: true,
		usesMeshDisassembler: false,
		libs: {
			locations: [
				'node_modules/three/build/three.min.js',
				'node_modules/three/examples/js/libs/draco/draco_decoder.js'
			],
			path: scope.builderPath
		},
		provideThree: true
	}
};


THREE.WWDRACOLoader = function () {
	this.dracoBuilderPath = '../../';
	this.dracoLibsPath = '';
	this.workerLoader = new THREE.WorkerLoader();
	this.workerSupport = new THREE.WorkerLoader.WorkerSupport()
		.setTerminateWorkerOnLoad( false );
};

THREE.WWDRACOLoader.prototype = {

	constructor: THREE.WWDRACOLoader,

	setDracoBuilderPath: function ( dracoBuilderPath ) {
		this.dracoBuilderPath = dracoBuilderPath;
	},

	setDracoLibsPath: function ( dracoLibsPath ) {
		this.dracoLibsPath = dracoLibsPath;
	},

	decodeDracoFile: function ( rawBuffer, callback, attributeUniqueIdMap, attributeTypeMap ) {
		var wrapperOnMesh = function ( event, override ) {
			console.log( 'THREE.WWDRACOLoader delivered BufferGeometry!' );
			callback( event.detail.bufferGeometry );
		};

		var value;
		for ( var name in attributeTypeMap ) {

			value = attributeTypeMap[ name ];
			switch ( value ) {
				case Int8Array:
					attributeTypeMap[ name ] = 'Int8Array';
					break;
				case Uint8Array:
					attributeTypeMap[ name ] = 'Uint8Array';
					break;
				case Uint8ClampedArray:
					attributeTypeMap[ name ] = 'Uint8ClampedArray';
					break;
				case Int16Array:
					attributeTypeMap[ name ] = 'Int16Array';
					break;
				case Uint16Array:
					attributeTypeMap[ name ] = 'Uint16Array';
					break;
				case Int32Array:
					attributeTypeMap[ name ] = 'Int32Array';
					break;
				case Uint32Array:
					attributeTypeMap[ name ] = 'Uint32Array';
					break;
				case Float32Array:
					attributeTypeMap[ name ] = 'Float32Array';
					break;
				case Float64Array:
					attributeTypeMap[ name ] = 'Float64Array';
					break;
			}

		}
		var rd = new THREE.WorkerLoader.ResourceDescriptor( 'Buffer', 'DracoLoaderArrayBuffer', rawBuffer );
		var parserConfiguration = {	resourcePath: this.dracoLibsPath };
		rd.setParserConfiguration( parserConfiguration );
		rd.setInputDataOption( 'attributeUniqueIdMap', attributeUniqueIdMap );
		rd.setInputDataOption( 'attributeTypeMap', attributeTypeMap );
		var loadingTaskConfig = new THREE.WorkerLoader.LoadingTaskConfig();
		loadingTaskConfig
			.setLoaderConfig( THREE.WLDRACOLoader, {
				builderPath: this.dracoBuilderPath
			} )
			.addResourceDescriptor( rd )
			.setCallbacksParsing( wrapperOnMesh );

		this.workerLoader.executeLoadingTaskConfig( loadingTaskConfig, this.workerSupport );
	}
};
