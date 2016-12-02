/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

THREE.OBJLoader.Parser = (function () {

	var CODE_LF = 10;
	var CODE_CR = 13;
	var CODE_SPACE = 32;
	var CODE_SLASH = 47;
	var STRING_LF = '\n';
	var STRING_CR = '\r';
	var STRING_SPACE = ' ';
	var STRING_SLASH = '/';
	var LINE_F = 'f';
	var LINE_G = 'g';
	var LINE_L = 'l';
	var LINE_O = 'o';
	var LINE_S = 's';
	var LINE_V = 'v';
	var LINE_VT = 'vt';
	var LINE_VN = 'vn';
	var LINE_MTLLIB = 'mtllib';
	var LINE_USEMTL = 'usemtl';

	function Parser( meshCreator ) {
		this.meshCreator = meshCreator;
		this.rawObject = null;
		this.inputObjectCount = 1;
	}

	Parser.prototype.validate = function () {
		this.rawObject = new THREE.OBJLoader.RawObject();
		this.inputObjectCount = 1;
	};

	Parser.prototype.parseArrayBuffer = function ( arrayBuffer ) {
		var arrayBufferView = new Uint8Array( arrayBuffer );
		var length = arrayBufferView.byteLength;
		var buffer = new Array( 256 );
		var bufferPointer = 0;
		var slashes = new Array( 256 );
		var slashesPointer = 0;
		var reachedFaces = false;
		var code;
		var word = '';
		for ( var i = 0; i < length; i++ ) {

			code = arrayBufferView[ i ];
			switch ( code ) {
				case CODE_SPACE:
					if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
					word = '';
					break;

				case CODE_SLASH:
					slashes[ slashesPointer++ ] = i;
					if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
					word = '';
					break;

				case CODE_LF:
					if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
					word = '';
					reachedFaces = this.processLine( buffer, bufferPointer, slashes, slashesPointer, reachedFaces );
					slashesPointer = 0;
					bufferPointer = 0;
					break;

				case CODE_CR:
					break;

				default:
					word += String.fromCharCode( code );
					break;
			}
		}
	};

	Parser.prototype.parseText = function ( text ) {
		var length = text.length;
		var buffer = new Array( 256 );
		var bufferPointer = 0;
		var slashes = new Array( 256 );
		var slashesPointer = 0;
		var reachedFaces = false;
		var char;
		var word = '';
		for ( var i = 0; i < length; i++ ) {

			char = text[ i ];
			switch ( char ) {
				case STRING_SPACE:
					if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
					word = '';
					break;

				case STRING_SLASH:
					slashes[ slashesPointer++ ] = i;
					if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
					word = '';
					break;

				case STRING_LF:
					if ( word.length > 0 ) buffer[ bufferPointer++ ] = word;
					word = '';
					reachedFaces = this.processLine( buffer, bufferPointer, slashes, slashesPointer, reachedFaces );
					slashesPointer = 0;
					bufferPointer = 0;
					break;

				case STRING_CR:
					break;

				default:
					word += char;
			}
		}
	};

	Parser.prototype.processLine = function ( buffer, bufferPointer, slashes, slashesPointer, reachedFaces ) {
		if ( bufferPointer < 1 ) return reachedFaces;

		var bufferLength = bufferPointer - 1;
		switch ( buffer[ 0 ] ) {
			case LINE_V:

				// object complete instance required if reached faces already (= reached next block of v)
				if ( reachedFaces ) {

					this.processCompletedObject( true );
					reachedFaces = false;
					this.rawObject.pushVertex( buffer );

				} else {

					this.rawObject.pushVertex( buffer );

				}
				break;

			case LINE_VT:
				this.rawObject.pushUv( buffer );
				break;

			case LINE_VN:
				this.rawObject.pushNormal( buffer );
				break;

			case LINE_F:
				reachedFaces = true;
				/*
				 * 0: "f vertex/uv/normal ..."
				 * 1: "f vertex/uv ..."
				 * 2: "f vertex//normal ..."
				 * 3: "f vertex ..."
				 */
				var haveQuad = bufferLength % 4 === 0;
				if ( slashesPointer > 2 && ( slashes[ 1 ] - slashes[ 0 ] ) === 1 ) {

					if ( haveQuad ) {
						this.rawObject.buildQuadVVn( buffer );
					} else {
						this.rawObject.buildFaceVVn( buffer );
					}

				} else if ( bufferLength === slashesPointer * 2 ) {

					if ( haveQuad ) {
						this.rawObject.buildQuadVVt( buffer );
					} else {
						this.rawObject.buildFaceVVt( buffer );
					}

				} else if ( bufferLength * 2 === slashesPointer * 3 ) {

					if ( haveQuad ) {
						this.rawObject.buildQuadVVtVn( buffer );
					} else {
						this.rawObject.buildFaceVVtVn( buffer );
					}

				} else {

					if ( haveQuad ) {
						this.rawObject.buildQuadV( buffer );
					} else {
						this.rawObject.buildFaceV( buffer );
					}

				}
				break;

			case LINE_L:
				if ( bufferLength === slashesPointer * 2 ) {

					this.rawObject.buildLineVvt( buffer );

				} else {

					this.rawObject.buildLineV( buffer );

				}
				break;

			case LINE_S:
				this.rawObject.pushSmoothingGroup( buffer[ 1 ] );
				break;

			case LINE_G:
				this.rawObject.pushGroup( buffer[ 1 ] );
				break;

			case LINE_O:
				if ( this.rawObject.vertices.length > 0 ) {

					this.processCompletedObject( false );
					reachedFaces = false;
					this.rawObject.pushObject( buffer[ 1 ] );

				} else {

					this.rawObject.pushObject( buffer[ 1 ] );

				}

				break;

			case LINE_MTLLIB:
				this.rawObject.pushMtllib( buffer[ 1 ] );
				break;

			case LINE_USEMTL:
				this.rawObject.pushUsemtl( buffer[ 1 ] );
				break;

			default:
				break;
		}
		return reachedFaces;
	};


	Parser.prototype.processCompletedObject = function ( vertexDetection ) {
		this.rawObject.finalize( this.meshCreator, this.inputObjectCount );
		if ( this.debug ) this.rawObject.createReport( this.inputObjectCount, true );

		this.inputObjectCount++;
		this.rawObject = this.rawObject.newInstance( vertexDetection );
	};

	Parser.prototype.finalize = function () {
		this.processCompletedObject( false );
	};

	return Parser;
})();

THREE.OBJLoader.RawObject = (function () {

	function RawObject() {
		this.globalVertexOffset = 1;
		this.globalUvOffset = 1;
		this.globalNormalOffset = 1;

		this.objectName = 'none';
		this.vertices = [];
		this.normals = [];
		this.uvs = [];
		this.mtllibName = '';

		// faces are stored according combined index of object, group, material
		this.activeGroupName = 'none';
		this.activeMtlName = 'none';
		this.activeSmoothingGroup = 0;

		this.objectGroupCount = 0;
		this.mtlCount = 0;
		this.smoothingGroupCount = 0;

		this.rawObjectDescriptions = [];
		var index = this.buildIndexRegular();
		this.rawObjectDescriptionInUse = new THREE.OBJLoader.RawObjectDescription( this.objectName, this.activeGroupName, this.activeMtlName, this.activeSmoothingGroup );
		this.rawObjectDescriptions[ index ] = this.rawObjectDescriptionInUse;
	}

	RawObject.prototype.newInstance = function ( vertexDetection ) {
		var newRawObject = new RawObject();
		if ( vertexDetection ) {
			newRawObject.activeGroupName = this.activeGroupName;
			newRawObject.rawObjectDescriptionInUse.groupName = this.activeGroupName;
		}
		newRawObject.globalVertexOffset = this.globalVertexOffset + this.vertices.length / 3;
		newRawObject.globalUvOffset = this.globalUvOffset + this.uvs.length / 2;
		newRawObject.globalNormalOffset = this.globalNormalOffset + this.normals.length / 3;

		return newRawObject;
	};

	RawObject.prototype.pushVertex = function ( buffer ) {
		var vertices = this.vertices;
		vertices.push( parseFloat( buffer[ 1 ] ) );
		vertices.push( parseFloat( buffer[ 2 ] ) );
		vertices.push( parseFloat( buffer[ 3 ] ) );
	};

	RawObject.prototype.pushUv = function ( buffer ) {
		var uvs = this.uvs;
		uvs.push( parseFloat( buffer[ 1 ] ) );
		uvs.push( parseFloat( buffer[ 2 ] ) );
	};

	RawObject.prototype.pushNormal = function ( buffer ) {
		var normals = this.normals;
		normals.push( parseFloat( buffer[ 1 ] ) );
		normals.push( parseFloat( buffer[ 2 ] ) );
		normals.push( parseFloat( buffer[ 3 ] ) );
	};

	RawObject.prototype.pushObject = function ( objectName ) {
		this.objectName = objectName;
	};

	RawObject.prototype.pushMtllib = function ( mtllibName ) {
		this.mtllibName = mtllibName;
	};

	RawObject.prototype.pushGroup = function ( groupName ) {
		if ( this.activeGroupName === groupName ) return;
		this.activeGroupName = groupName;
		this.objectGroupCount++;

		this.verifyIndex();
	};

	RawObject.prototype.pushUsemtl = function ( mtlName ) {
		if ( this.activeMtlName === mtlName ) return;
		this.activeMtlName = mtlName;
		this.mtlCount++;

		this.verifyIndex();
	};

	RawObject.prototype.pushSmoothingGroup = function ( activeSmoothingGroup ) {
		var normalized = activeSmoothingGroup === 'off' ? 0 : activeSmoothingGroup;
		if ( this.activeSmoothingGroup === normalized ) return;
		this.activeSmoothingGroup = normalized;
		this.smoothingGroupCount++;

		this.verifyIndex();
	};

	RawObject.prototype.verifyIndex = function () {
		var index = ( this.activeSmoothingGroup === 0 ) ? this.buildIndexOverride( 0 ) : this.buildIndexOverride( 1 );

		if ( this.rawObjectDescriptions[ index ] === undefined ) {

			this.rawObjectDescriptionInUse = this.rawObjectDescriptions[ index ] = new THREE.OBJLoader.RawObjectDescription(
				this.objectName, this.activeGroupName, this.activeMtlName, this.activeSmoothingGroup );

		} else {

			this.rawObjectDescriptionInUse = this.rawObjectDescriptions[ index ];

		}
	};

	RawObject.prototype.buildIndexRegular = function () {
		return this.objectName + '|' + this.activeGroupName + '|' + this.activeMtlName + '|' + this.activeSmoothingGroup;
	};

	RawObject.prototype.buildIndexOverride = function ( smoothingGroup ) {
		return this.objectName + '|' + this.activeGroupName + '|' + this.activeMtlName + '|' + smoothingGroup;
	};

	/*
	 * Build Face/Quad: first element in indexArray is the line identification, therefore offset of one needs to be taken into account
	 * N-Gons are not supported
	 * Quad Faces: FaceA: 0, 1, 2  FaceB: 2, 3, 0
	 *
	 * 0: "f vertex/uv/normal	vertex/uv/normal	vertex/uv/normal	(vertex/uv/normal)"
	 * 1: "f vertex/uv          vertex/uv           vertex/uv           (vertex/uv       )"
	 * 2: "f vertex//normal     vertex//normal      vertex//normal      (vertex//normal  )"
	 * 3: "f vertex             vertex              vertex              (vertex          )"
	 *
	 * @param indexArray
	 * @param faceType
	 */
	var QUAD_INDICES_1 = [ 1, 2, 3, 3, 4, 1 ];
	var QUAD_INDICES_2 = [ 1, 3, 5, 5, 7, 1 ];
	var QUAD_INDICES_3 = [ 1, 4, 7, 7, 10, 1 ];

	RawObject.prototype.buildQuadVVtVn = function ( indexArray ) {
		for ( var i = 0; i < 6; i ++ ) {
			this.attachFaceV_( indexArray[ QUAD_INDICES_3[ i ] ] );
			this.attachFaceVt( indexArray[ QUAD_INDICES_3[ i ] + 1 ] );
			this.attachFaceVn( indexArray[ QUAD_INDICES_3[ i ] + 2 ] );
		}
	};

	RawObject.prototype.buildQuadVVt = function ( indexArray ) {
		for ( var i = 0; i < 6; i ++ ) {
			this.attachFaceV_( indexArray[ QUAD_INDICES_2[ i ] ] );
			this.attachFaceVt( indexArray[ QUAD_INDICES_2[ i ] + 1 ] );
		}
	};

	RawObject.prototype.buildQuadVVn = function ( indexArray ) {
		for ( var i = 0; i < 6; i ++ ) {
			this.attachFaceV_( indexArray[ QUAD_INDICES_2[ i ] ] );
			this.attachFaceVn( indexArray[ QUAD_INDICES_2[ i ] + 1 ] );
		}
	};

	RawObject.prototype.buildQuadV = function ( indexArray ) {
		for ( var i = 0; i < 6; i ++ ) {
			this.attachFaceV_( indexArray[ QUAD_INDICES_1[ i ] ] );
		}
	};

	RawObject.prototype.buildFaceVVtVn = function ( indexArray ) {
		for ( var i = 1; i < 10; i += 3 ) {
			this.attachFaceV_( indexArray[ i ] );
			this.attachFaceVt( indexArray[ i + 1 ] );
			this.attachFaceVn( indexArray[ i + 2 ] );
		}
	};

	RawObject.prototype.buildFaceVVt = function ( indexArray ) {
		for ( var i = 1; i < 7; i += 2 ) {
			this.attachFaceV_( indexArray[ i ] );
			this.attachFaceVt( indexArray[ i + 1 ] );
		}
	};

	RawObject.prototype.buildFaceVVn = function ( indexArray ) {
		for ( var i = 1; i < 7; i += 2 ) {
			this.attachFaceV_( indexArray[ i ] );
			this.attachFaceVn( indexArray[ i + 1 ] );
		}
	};

	RawObject.prototype.buildFaceV = function ( indexArray ) {
		for ( var i = 1; i < 4; i ++ ) {
			this.attachFaceV_( indexArray[ i ] );
		}
	};

	RawObject.prototype.attachFaceV_ = function ( faceIndex ) {
		var faceIndexInt =  parseInt( faceIndex );
		var index = ( faceIndexInt - this.globalVertexOffset ) * 3;

		var rodiu = this.rawObjectDescriptionInUse;
		var vertices = this.vertices;
		rodiu.vertices.push( vertices[ index++ ] );
		rodiu.vertices.push( vertices[ index++ ] );
		rodiu.vertices.push( vertices[ index ] );
	};

	RawObject.prototype.attachFaceVt = function ( faceIndex ) {
		var faceIndexInt =  parseInt( faceIndex );
		var index = ( faceIndexInt - this.globalUvOffset ) * 2;

		var rodiu = this.rawObjectDescriptionInUse;
		var uvs = this.uvs;
		rodiu.uvs.push( uvs[ index++ ] );
		rodiu.uvs.push( uvs[ index ] );
	};

	RawObject.prototype.attachFaceVn = function ( faceIndex ) {
		var faceIndexInt =  parseInt( faceIndex );
		var index = ( faceIndexInt - this.globalNormalOffset ) * 3;

		var rodiu = this.rawObjectDescriptionInUse;
		var normals = this.normals;
		rodiu.normals.push( normals[ index++ ] );
		rodiu.normals.push( normals[ index++ ] );
		rodiu.normals.push( normals[ index ] );
	};

	/*
	 * Support for lines with or without texture. irst element in indexArray is the line identification
	 * 0: "f vertex/uv		vertex/uv 		..."
	 * 1: "f vertex			vertex 			..."
	 */
	RawObject.prototype.buildLineVvt = function ( lineArray ) {
		var length = lineArray.length;
		for ( var i = 1; i < length; i ++ ) {
			this.vertices.push( parseInt( lineArray[ i ] ) );
			this.uvs.push( parseInt( lineArray[ i ] ) );
		}
	};

	RawObject.prototype.buildLineV = function ( lineArray ) {
		var length = lineArray.length;
		for ( var i = 1; i < length; i++ ) {
			this.vertices.push( parseInt( lineArray[ i ] ) );
		}
	};

	/**
	 * Clear any empty rawObjectDescription
	 */
	RawObject.prototype.finalize = function ( meshCreator, inputObjectCount ) {
		var temp = this.rawObjectDescriptions;
		this.rawObjectDescriptions = [];
		var rawObjectDescription;
		var index = 0;
		var absoluteVertexCount = 0;
		var absoluteNormalCount = 0;
		var absoluteUvCount = 0;

		for ( var name in temp ) {

			rawObjectDescription = temp[ name ];
			if ( rawObjectDescription.vertices.length > 0 ) {

				if ( rawObjectDescription.objectName === 'none' ) rawObjectDescription.objectName = rawObjectDescription.groupName;
				this.rawObjectDescriptions[ index++ ] = rawObjectDescription;
				absoluteVertexCount += rawObjectDescription.vertices.length;
				absoluteUvCount += rawObjectDescription.uvs.length;
				absoluteNormalCount += rawObjectDescription.normals.length;

			}
		}

		meshCreator.buildMesh(
			this.rawObjectDescriptions,
			inputObjectCount,
			absoluteVertexCount,
			absoluteNormalCount,
			absoluteUvCount
		);
	};

	RawObject.prototype.createReport = function ( inputObjectCount, printDirectly ) {
		var report = {
			name: this.objectName ? this.objectName : 'groups',
			mtllibName: this.mtllibName,
			vertexCount: this.vertices.length / 3,
			normalCount: this.normals.length / 3,
			uvCount: this.uvs.length / 2,
			objectGroupCount: this.objectGroupCount,
			smoothingGroupCount: this.smoothingGroupCount,
			mtlCount: this.mtlCount,
			rawObjectDescriptions: this.rawObjectDescriptions.length
		};

		if ( printDirectly ) {
			console.log( 'Input Object number: ' + inputObjectCount + ' Object name: ' + report.name );
			console.log( 'Mtllib name: ' + report.mtllibName );
			console.log( 'Vertex count: ' + report.vertexCount );
			console.log( 'Normal count: ' + report.normalCount );
			console.log( 'UV count: ' + report.uvCount );
			console.log( 'Group count: ' + report.objectGroupCount );
			console.log( 'SmoothingGroup count: ' + report.smoothingGroupCount );
			console.log( 'Material count: ' + report.mtlCount );
			console.log( 'Real RawObjectDescription count: ' + report.rawObjectDescriptions );
			console.log( '' );
		}

		return report;
	};

	return RawObject;
})();

THREE.OBJLoader.RawObjectDescription = (function () {

	function RawObjectDescription( objectName, groupName, materialName, smoothingGroup ) {
		this.objectName = objectName;
		this.groupName = groupName;
		this.materialName = materialName;
		this.smoothingGroup = smoothingGroup;
		this.vertices = [];
		this.uvs = [];
		this.normals = [];
	}

	return RawObjectDescription;
})();
