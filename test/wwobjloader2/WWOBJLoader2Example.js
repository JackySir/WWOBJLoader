/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var WWOBJLoader2Example = (function () {

	function WWOBJLoader2Example( elementToBindTo ) {
		this.renderer = null;
		this.canvas = elementToBindTo;
		this.aspectRatio = 1;
		this.recalcAspectRatio();

		this.scene = null;
		this.cameraDefaults = {
			posCamera: new THREE.Vector3( 0.0, 175.0, 500.0 ),
			posCameraTarget: new THREE.Vector3( 0, 0, 0 ),
			near: 0.1,
			far: 10000,
			fov: 45
		};
		this.camera = null;
		this.cameraTarget = this.cameraDefaults.posCameraTarget;

		this.controls = null;

		this.flatShading = false;
		this.doubleSide = false;

		this.cube = null;
		this.pivot = null;
	}

	WWOBJLoader2Example.prototype.initGL = function () {
		this.renderer = new THREE.WebGLRenderer( {
			canvas: this.canvas,
			antialias: true,
			autoClear: true
		} );
		this.renderer.setClearColor( 0x050505 );

		this.scene = new THREE.Scene();

		this.camera = new THREE.PerspectiveCamera( this.cameraDefaults.fov, this.aspectRatio, this.cameraDefaults.near, this.cameraDefaults.far );
		this.resetCamera();
		this.controls = new THREE.TrackballControls( this.camera, this.renderer.domElement );

		var ambientLight = new THREE.AmbientLight( 0x404040 );
		var directionalLight1 = new THREE.DirectionalLight( 0xC0C090 );
		var directionalLight2 = new THREE.DirectionalLight( 0xC0C090 );

		directionalLight1.position.set( -100, -50, 100 );
		directionalLight2.position.set( 100, 50, -100 );

		this.scene.add( directionalLight1 );
		this.scene.add( directionalLight2 );
		this.scene.add( ambientLight );

		var helper = new THREE.GridHelper( 1200, 60, 0xFF4444, 0x404040 );
		this.scene.add( helper );

		var geometry = new THREE.BoxBufferGeometry( 10, 10, 10 );
		var material = new THREE.MeshNormalMaterial();
		this.cube = new THREE.Mesh( geometry, material );
		this.cube.position.set( 0, 0, 0 );
		this.scene.add( this.cube );

		this.pivot = new THREE.Object3D();
		this.pivot.name = 'Pivot';
		this.scene.add( this.pivot );
	};

	WWOBJLoader2Example.prototype.useParseSync = function () {
		var modelName = 'female02';
		this._reportProgress( { detail: { text: 'Loading: ' + modelName } } );

		var objLoader2 = new THREE.OBJLoader2();
		objLoader2.setModelName( modelName );

		var scope = this;
		var onLoadMtl = function ( mtlParseResult ) {
			var fileLoader = new THREE.FileLoader();
			fileLoader.setPath( '../../' );
			fileLoader.setResponseType( 'arraybuffer' );
			fileLoader.load( 'resource/obj/female02/female02.obj',
				function ( content ) {
					var local = new THREE.Object3D();
					local.name = 'Pivot_female02';
					local.position.set( 75, 0, 0 );
					scope.pivot.add( local );
					local.add( objLoader2.parse( content ) );

					scope._reportProgress( { detail: { text: 'Loading complete: ' + modelName } } );
				}
			);
		};
		objLoader2.load( '../../resource/obj/female02/female02.mtl', onLoadMtl );
	};


	WWOBJLoader2Example.prototype.useParseAsync = function () {
		var modelName = 'female02_vertex' ;
		this._reportProgress( { detail: { text: 'Loading: ' + modelName } } );

		var callbackOnLoad = function ( event ) {
			var local = new THREE.Object3D();
			local.name = 'Pivot_female02_vertex';
			local.position.set( -75, 0, 0 );
			scope.pivot.add( local );
			local.add( event.detail.result );

			scope._reportProgress( { detail: { text: 'Loading complete: ' + event.detail.modelName } } );
		};

		var scope = this;

		var fileLoader = new THREE.FileLoader();
		fileLoader.setPath( '../../' );
		fileLoader.setResponseType( 'arraybuffer' );
		var filename = 'resource/obj/female02/female02_vertex_colors.obj';
		fileLoader.load( filename,
			function ( content ) {
				var objLoader = new THREE.OBJLoader2();
				objLoader.setModelName( modelName );

				var workerLoader = new THREE.WorkerLoader();
				workerLoader.getLoadingTask()
					.setLoader( objLoader )
					.setTerminateWorkerOnLoad( true );
				workerLoader.parseAsync( content, callbackOnLoad );

				scope._reportProgress( { detail: { text: 'File loading complete: ' + filename } } );
			}
		);
	};

	WWOBJLoader2Example.prototype.useLoadSync = function () {
		var modelName = 'male02';
		this._reportProgress( { detail: { text: 'Loading: ' + modelName } } );

		var objLoader2 = new THREE.OBJLoader2();
		objLoader2.setModelName( modelName );
		objLoader2.setUseIndices( true );

		var scope = this;
		var callbackOnLoad = function ( object3d ) {
			var local = new THREE.Object3D();
			local.name = 'Pivot_male02';
			local.position.set( 0, 0, -75 );
			scope.pivot.add( local );
			local.add( object3d );

			scope._reportProgress( { detail: { text: 'Loading complete: ' + objLoader2.modelName } } );
		};

		var onLoadMtl = function ( mtlParseResult ) {
			objLoader2.load( '../../resource/obj/male02/male02.obj', callbackOnLoad, null, null, null );
		};
		objLoader2.load( '../../resource/obj/male02/male02.mtl', onLoadMtl );
	};

	WWOBJLoader2Example.prototype.useLoadAsync = function () {
		var modelName = 'WaltHead';
		this._reportProgress( { detail: { text: 'Loading: ' + modelName } } );

		var objLoader2 = new THREE.OBJLoader2();
		objLoader2.setModelName( modelName );

		var local = new THREE.Object3D();
		local.name = 'Pivot_WaltHead';
		local.position.set( -125, 50, 0 );
		var scale = 0.5;
		local.scale.set( scale, scale, scale );
		this.pivot.add( local );

		var scope = this;
		var callbackOnLoad = function ( event ) {
			scope._reportProgress( { detail: { text: 'Loading complete: ' + event.detail.modelName } } );
		};

		var onLoadMtl = function ( mtlParseResult ) {
			var workerLoader = new THREE.WorkerLoader()
				.setLoader( objLoader2 );
			workerLoader.getLoadingTask()
				.setTerminateWorkerOnLoad( false )
				.setBaseObject3d( local );
			workerLoader.loadAsync( '../../resource/obj/walt/WaltHead.obj', callbackOnLoad );

		};
		objLoader2.load( '../../resource/obj/walt/WaltHead.mtl', onLoadMtl );
	};

	WWOBJLoader2Example.prototype.useRunSync = function () {
		var local = new THREE.Object3D();
		local.position.set( 0, 0, 100 );
		local.scale.set( 50.0, 50.0, 50.0 );
		this.pivot.add( local );

		var scope = this;
		var callbackOnLoad = function ( event ) {
			scope._reportProgress( { detail: { text: 'Loading complete: ' + event.detail.modelName } } );
		};
		var callbackOnProgress = function ( event ) {
			scope._reportProgress( event );
		};

		var rd = new THREE.WorkerLoader.ResourceDescriptor( 'URL', 'Cerberus.obj', '../../resource/obj/cerberus/Cerberus.obj' );
		rd.configureAsync( true, true );
		var loadingTaskConfig = new THREE.WorkerLoader.LoadingTaskConfig( {
				instanceNo: 42,
				baseObject3d: local
			} )
			.setLoaderConfig( THREE.OBJLoader2 )
			.addResourceDescriptor( rd )
			.setCallbacksPipeline( callbackOnLoad )
			.setCallbacksApp( callbackOnProgress );
		new THREE.WorkerLoader()
			.executeLoadingTaskConfig( loadingTaskConfig );
	};

	WWOBJLoader2Example.prototype.useRunAsyncMeshAlter = function () {
		var local = new THREE.Object3D();
		local.position.set( 125, 50, 0 );
		local.name = 'Pivot_vive-controller';
		this.pivot.add( local );

		var scope = this;
		var callbackOnLoad = function ( event ) {
			var mesh = event.detail.result;
			var scale = 200.0;
			mesh.scale.set( scale, scale, scale );
			local.add( mesh );
			scope._reportProgress( { detail: { text: 'Loading complete: ' + event.detail.modelName } } );
		};

		var rd = new THREE.WorkerLoader.ResourceDescriptor( 'URL', 'vr_controller_vive_1_5.obj', '../../resource/obj/vive-controller/vr_controller_vive_1_5.obj' );
		var loadingTaskConfig = new THREE.WorkerLoader.LoadingTaskConfig( {
				terminateWorkerOnLoad: false
			} )
			.setLoaderConfig( THREE.OBJLoader2 )
			.addResourceDescriptor( rd )
			.setCallbacksPipeline( callbackOnLoad );
		new THREE.WorkerLoader()
			.getLoadingTask()
			.execute( loadingTaskConfig );
	};

	WWOBJLoader2Example.prototype.finalize = function () {
		this._reportProgress( { detail: { text: '' } } );
	};

	WWOBJLoader2Example.prototype._reportProgress = function( event ) {
		var output = '';
		if ( THREE.MeshTransfer.Validator.isValid( event.detail ) && THREE.MeshTransfer.Validator.isValid( event.detail.text ) ) {
			output = event.detail.text;
		}
		console.log( 'Progress: ' + output );
		document.getElementById( 'feedback' ).innerHTML = output;
	};

	WWOBJLoader2Example.prototype.resizeDisplayGL = function () {
		this.controls.handleResize();

		this.recalcAspectRatio();
		this.renderer.setSize( this.canvas.offsetWidth, this.canvas.offsetHeight, false );

		this.updateCamera();
	};

	WWOBJLoader2Example.prototype.recalcAspectRatio = function () {
		this.aspectRatio = ( this.canvas.offsetHeight === 0 ) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
	};

	WWOBJLoader2Example.prototype.resetCamera = function () {
		this.camera.position.copy( this.cameraDefaults.posCamera );
		this.cameraTarget.copy( this.cameraDefaults.posCameraTarget );

		this.updateCamera();
	};

	WWOBJLoader2Example.prototype.updateCamera = function () {
		this.camera.aspect = this.aspectRatio;
		this.camera.lookAt( this.cameraTarget );
		this.camera.updateProjectionMatrix();
	};

	WWOBJLoader2Example.prototype.render = function () {
		if ( ! this.renderer.autoClear ) this.renderer.clear();

		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;

		this.renderer.render( this.scene, this.camera );
	};

	WWOBJLoader2Example.prototype.alterShading = function () {
		var scope = this;
		scope.flatShading = ! scope.flatShading;
		console.log( scope.flatShading ? 'Enabling flat shading' : 'Enabling smooth shading');

		scope.traversalFunction = function ( material ) {
			material.flatShading = scope.flatShading;
			material.needsUpdate = true;
		};
		var scopeTraverse = function ( object3d ) {
			scope.traverseScene( object3d );
		};
		scope.pivot.traverse( scopeTraverse );
	};

	WWOBJLoader2Example.prototype.alterDouble = function () {
		var scope = this;
		scope.doubleSide = ! scope.doubleSide;
		console.log( scope.doubleSide ? 'Enabling DoubleSide materials' : 'Enabling FrontSide materials');

		scope.traversalFunction  = function ( material ) {
			material.side = scope.doubleSide ? THREE.DoubleSide : THREE.FrontSide;
		};

		var scopeTraverse = function ( object3d ) {
			scope.traverseScene( object3d );
		};
		scope.pivot.traverse( scopeTraverse );
	};

	WWOBJLoader2Example.prototype.traverseScene = function ( object3d ) {
		if ( object3d.material instanceof THREE.MultiMaterial ) {

			var materials = object3d.material.materials;
			for ( var name in materials ) {

				if ( materials.hasOwnProperty( name ) )	this.traversalFunction( materials[ name ] );

			}

		} else if ( object3d.material ) {

			this.traversalFunction( object3d.material );

		}
	};

	return WWOBJLoader2Example;

})();
