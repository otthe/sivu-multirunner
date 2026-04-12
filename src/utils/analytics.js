import path from "node:path";
import fs from "node:fs";
import { lstat, readdir, stat } from "node:fs/promises";

export function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(4) + " MB";
}

// ================================================================
// folder size
// ================================================================

//https://www.npmjs.com/package/get-folder-size
//https://github.com/alessioalex/get-folder-size/blob/master/index.js
// CLOSE ENOUGH...
export async function getFolderSize(itemPath, options) {
	return await core(itemPath, options, { errors: true });
}

getFolderSize.loose = async (itemPath, options) =>
	await core(itemPath, options);

getFolderSize.strict = async (itemPath, options) =>
	await core(itemPath, options, { strict: true });

async function core(rootItemPath, options = {}, returnType = {}) {
	const fs = options.fs || (await import("node:fs/promises"));

	let folderSize = 0n;
	const foundInos = new Set();
	const errors = [];

	await processItem(rootItemPath);

	async function processItem(itemPath) {
		if (options.ignore?.test(itemPath)) return;

		const stats = returnType.strict
			? await fs.lstat(itemPath, { bigint: true })
			: await fs
					.lstat(itemPath, { bigint: true })
					.catch((error) => errors.push(error));
		if (typeof stats !== "object") return;
		if (!foundInos.has(stats.ino)) {
			foundInos.add(stats.ino);
			folderSize += stats.size;
		}

		if (stats.isDirectory()) {
			const directoryItems = returnType.strict
				? await fs.readdir(itemPath)
				: await fs
						.readdir(itemPath)
						.catch((error) => errors.push(error));
			if (typeof directoryItems !== "object") return;
			await Promise.all(
				directoryItems.map((directoryItem) =>
					processItem(path.join(itemPath, directoryItem)),
				),
			);
		}
	}

	if (!options.bigint) {
		if (folderSize > BigInt(Number.MAX_SAFE_INTEGER)) {
			const error = new RangeError(
				"The folder size is too large to return as a Number. You can instruct this package to return a BigInt instead.",
			);
			if (returnType.strict) {
				throw error;
			}
			errors.push(error);
			folderSize = Number.MAX_SAFE_INTEGER;
		} else {
			folderSize = Number(folderSize);
		}
	}

	if (returnType.errors) {
		return {
			size: folderSize,
			errors: errors.length > 0 ? errors : null,
		};
	} else {
		return folderSize;
	}
}


// ==========================================================================
// object size
// from: https://www.npmjs.com/package/object-sizeof
// https://github.com/miktam/sizeof/blob/master/indexv2.js
// ==========================================================================
const ECMA_SIZES = {
  STRING: 2,
  BOOLEAN: 4,
  BYTES: 4,
  NUMBER: 8,
  Int8Array: 1,
  Uint8Array: 1,
  Uint8ClampedArray: 1,
  Int16Array: 2,
  Uint16Array: 2,
  Int32Array: 4,
  Uint32Array: 4,
  Float32Array: 4,
  Float64Array: 8
};
const Buffer =
  typeof window !== 'undefined' ? require('buffer/').Buffer : global.Buffer

/**
 * Precisely calculate size of string in node
 * Based on https://stackoverflow.com/questions/68789144/how-much-memory-do-v8-take-to-store-a-string/68791382#68791382
 * @param {} str
 */
function preciseStringSizeNode (str) {
  return 12 + 4 * Math.ceil(str.length / 4)
}

/**
 * In the browser environment, window and document are defined as global objects
 * @returns true if its a Node.js env, false if it is a browser
 */
function isNodeEnvironment () {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return false
  }
  return true
}

function getSizeOfTypedArray (typedArray) {
  if (typedArray.BYTES_PER_ELEMENT) {
    return typedArray.length * typedArray.BYTES_PER_ELEMENT
  }
  return -1 // error indication
}

/**
 * Size in bytes for complex objects
 * @param {*} obj
 * @returns size in bytes, or -1 if JSON.stringify threw an exception
 */
function objectSizeComplex (obj) {
  let totalSize = 0
  const errorIndication = -1

  try {
    // convert Map and Set to an object representation
    let convertedObj = obj
    if (obj instanceof Map) {
      convertedObj = Object.fromEntries(obj)
    } else if (obj instanceof Set) {
      convertedObj = Array.from(obj)
    }

    // handle typed arrays
    if (ArrayBuffer.isView(obj)) {
      return getSizeOfTypedArray(obj)
    }

    const serializedObj = JSON.stringify(convertedObj, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      } else if (typeof value === 'function') {
        return value.toString()
      } else if (typeof value === 'undefined') {
        return 'undefined'
      } else if (typeof value === 'symbol') {
        return value.toString()
      } else if (value instanceof RegExp) {
        return value.toString()
      } else {
        return value
      }
    })

    totalSize = Buffer.byteLength(serializedObj, 'utf8')
  } catch (ex) {
    // do not log anyting to console.error
    return new Error(errorIndication)
  }

  return totalSize
}

/**
 * Size in bytes for primitive types
 * @param {*} obj
 * @returns size in bytes
 */
function objectSizeSimple (obj) {
  const objectList = []
  const stack = [obj]
  let bytes = 0

  while (stack.length) {
    const value = stack.pop()

    if (typeof value === 'boolean') {
      bytes += ECMA_SIZES.BYTES
    } else if (typeof value === 'string') {
      if (isNodeEnvironment()) {
        bytes += preciseStringSizeNode(value)
      } else {
        bytes += value.length * ECMA_SIZES.STRING
      }
    } else if (typeof value === 'number') {
      bytes += ECMA_SIZES.NUMBER
    } else if (typeof value === 'symbol') {
      const isGlobalSymbol = Symbol.keyFor && Symbol.keyFor(obj)
      if (isGlobalSymbol) {
        bytes += Symbol.keyFor(obj).length * ECMA_SIZES.STRING
      } else {
        bytes += (obj.toString().length - 8) * ECMA_SIZES.STRING
      }
    } else if (typeof value === 'bigint') {
      bytes += Buffer.from(value.toString()).byteLength
    } else if (typeof value === 'function') {
      bytes += value.toString().length
    } else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
      objectList.push(value)

      for (const i in value) {
        stack.push(value[i])
      }
    }
  }
  return bytes
}

export function getObjectSize(obj) {
  let totalSize = 0

  if (obj !== null && typeof obj === 'object') {
    totalSize = objectSizeComplex(obj)
  } else {
    totalSize = objectSizeSimple(obj)
  }

  return totalSize
}


//https://stackoverflow.com/questions/30448002/how-to-get-directory-size-in-node-js-without-recursively-going-through-directory
// export const dirSize = async dir => {
//   const files = await readdir( dir, { withFileTypes: true } );

//   const paths = files.map( async file => {
//     const p = path.join( dir, file.name );
//     if ( file.isDirectory() ) return await dirSize( p );

//     if ( file.isFile() ) {
//       const { size } = await stat( p );
      
//       return size;
//     }

//     if (file.isSymbolicLink()) {
//       const { size } = await lstat(fullPath);
//       total += size;
//     }

//     return 0;
//   } );

//   return ( await Promise.all( paths ) ).flat( Infinity ).reduce( ( i, size ) => i + size, 0 );
// }
