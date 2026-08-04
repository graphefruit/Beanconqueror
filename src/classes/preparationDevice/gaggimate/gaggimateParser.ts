export class GaggimateParser {
  readonly HEADER_SIZE_V4 = 128;
  readonly HEADER_SIZE_V5 = 512;
  readonly SHOT_MAGIC = 0x544f4853; // 'SHOT' - matches backend SHOT_LOG_MAGIC
  readonly INDEX_MAGIC = 0x58444953; // 'SIDX'
  readonly TEMP_SCALE = 10;
  readonly PRESSURE_SCALE = 10;
  readonly FLOW_SCALE = 100;
  readonly WEIGHT_SCALE = 10;
  readonly RESISTANCE_SCALE = 100;

  // Field bit positions (must match shot_log_format.h)
  readonly FIELD_BITS = {
    T: 0, // tick
    TT: 1, // target temp
    CT: 2, // current temp
    TP: 3, // target pressure
    CP: 4, // current pressure
    FL: 5, // pump flow
    TF: 6, // target flow
    PF: 7, // puck flow
    VF: 8, // volumetric flow
    V: 9, // volumetric weight
    EV: 10, // estimated weight
    PR: 11, // puck resistance
    SI: 12, // system info (v2+)
    // Phase number moved to header transitions in v5+
  };

  // Field definitions with parsing info
  readonly FIELD_DEFS = {
    [this.FIELD_BITS.T]: {
      name: 't',
      type: 'uint16',
      scale: null,
      transform: (val, sampleInterval) => val * sampleInterval,
    },
    [this.FIELD_BITS.TT]: {
      name: 'tt',
      type: 'uint16',
      scale: this.TEMP_SCALE,
    },
    [this.FIELD_BITS.CT]: {
      name: 'ct',
      type: 'uint16',
      scale: this.TEMP_SCALE,
    },
    [this.FIELD_BITS.TP]: {
      name: 'tp',
      type: 'uint16',
      scale: this.PRESSURE_SCALE,
    },
    [this.FIELD_BITS.CP]: {
      name: 'cp',
      type: 'uint16',
      scale: this.PRESSURE_SCALE,
    },
    [this.FIELD_BITS.FL]: { name: 'fl', type: 'int16', scale: this.FLOW_SCALE },
    [this.FIELD_BITS.TF]: { name: 'tf', type: 'int16', scale: this.FLOW_SCALE },
    [this.FIELD_BITS.PF]: { name: 'pf', type: 'int16', scale: this.FLOW_SCALE },
    [this.FIELD_BITS.VF]: { name: 'vf', type: 'int16', scale: this.FLOW_SCALE },
    [this.FIELD_BITS.V]: {
      name: 'v',
      type: 'uint16',
      scale: this.WEIGHT_SCALE,
    },
    [this.FIELD_BITS.EV]: {
      name: 'ev',
      type: 'uint16',
      scale: this.WEIGHT_SCALE,
    },
    [this.FIELD_BITS.PR]: {
      name: 'pr',
      type: 'uint16',
      scale: this.RESISTANCE_SCALE,
    },
    [this.FIELD_BITS.SI]: {
      name: 'systemInfo',
      type: 'uint16',
      scale: null,
      transform: (val) => ({
        raw: val,
        shotStartedVolumetric: !!(val & 0x0001),
        currentlyVolumetric: !!(val & 0x0002),
        bluetoothScaleConnected: !!(val & 0x0004),
        volumetricAvailable: !!(val & 0x0008),
        extendedRecording: !!(val & 0x0010),
      }),
    },
    // Phase number field removed in v5+, moved to header transitions
  };

  /**
   * Parse binary shot index file
   * @param {ArrayBuffer} arrayBuffer - The binary index file data
   * @returns {Object} Parsed index with header and entries
   */
  public parseBinaryIndex(arrayBuffer) {
    const INDEX_HEADER_SIZE = 32;
    const INDEX_ENTRY_SIZE = 128;

    // Index entry flags
    const SHOT_FLAG_COMPLETED = 0x01;
    const SHOT_FLAG_DELETED = 0x02;
    const SHOT_FLAG_HAS_NOTES = 0x04;

    const view = new DataView(arrayBuffer);

    if (view.byteLength < INDEX_HEADER_SIZE) {
      throw new Error('Index file too small');
    }

    // Parse header
    const magic = view.getUint32(0, true);
    if (magic !== this.INDEX_MAGIC) {
      throw new Error(
        `Invalid index magic: 0x${magic.toString(16)} (expected 0x${this.INDEX_MAGIC.toString(16)})`,
      );
    }

    const version = view.getUint16(4, true);
    const entrySize = view.getUint16(6, true);
    const entryCount = view.getUint32(8, true);
    const nextId = view.getUint32(12, true);

    if (entrySize !== INDEX_ENTRY_SIZE) {
      throw new Error(
        `Unsupported entry size ${entrySize} (expected ${INDEX_ENTRY_SIZE})`,
      );
    }

    const expectedSize = INDEX_HEADER_SIZE + entryCount * INDEX_ENTRY_SIZE;
    if (view.byteLength < expectedSize) {
      throw new Error(
        `Index file truncated: ${view.byteLength} bytes (expected ${expectedSize})`,
      );
    }

    // Parse entries
    const entries = [];
    for (let i = 0; i < entryCount; i++) {
      const base = INDEX_HEADER_SIZE + i * INDEX_ENTRY_SIZE;

      const id = view.getUint32(base + 0, true);
      const timestamp = view.getUint32(base + 4, true);
      const duration = view.getUint32(base + 8, true);
      const volume = view.getUint16(base + 12, true);
      const rating = view.getUint8(base + 14);
      const flags = view.getUint8(base + 15);

      const profileIdBytes = new Uint8Array(arrayBuffer, base + 16, 32);
      const profileNameBytes = new Uint8Array(arrayBuffer, base + 48, 48);

      const profileId = this.decodeCString(profileIdBytes);
      const profileName = this.decodeCString(profileNameBytes);

      // Per-shot aggregates; 0 means "not recorded" (entries written by older firmware)
      const avgTempRaw = view.getUint16(base + 96, true);
      const maxPressureRaw = view.getUint16(base + 98, true);
      const avgFlowRaw = view.getUint16(base + 100, true);

      // Convert volume from scaled integer to float
      const volumeFloat = volume > 0 ? volume / this.WEIGHT_SCALE : null;

      entries.push({
        id,
        timestamp,
        duration,
        volume: volumeFloat,
        rating,
        flags,
        profileId,
        profileName,
        avgTemp: avgTempRaw > 0 ? avgTempRaw / this.TEMP_SCALE : null,
        maxPressure:
          maxPressureRaw > 0 ? maxPressureRaw / this.PRESSURE_SCALE : null,
        avgFlow: avgFlowRaw > 0 ? avgFlowRaw / this.FLOW_SCALE : null,
        // Computed flags
        completed: !!(flags & SHOT_FLAG_COMPLETED),
        deleted: !!(flags & SHOT_FLAG_DELETED),
        hasNotes: !!(flags & SHOT_FLAG_HAS_NOTES),
        incomplete: !(flags & SHOT_FLAG_COMPLETED),
      });
    }

    return {
      header: {
        magic,
        version,
        entrySize,
        entryCount,
        nextId,
      },
      entries,
    };
  }

  public parseBinaryShot(arrayBuffer, id) {
    const view = new DataView(arrayBuffer);

    // Read basic header info first
    if (view.byteLength < 16) throw new Error('File too small for header');

    const magic = view.getUint32(0, true);
    if (magic !== this.SHOT_MAGIC)
      throw new Error(
        `Bad magic: expected 0x${this.SHOT_MAGIC.toString(16)}, got 0x${magic.toString(16)}`,
      );

    const version = view.getUint8(4);
    const deviceSampleSize = view.getUint8(5); // reserved0 holds sample size
    const headerSize = view.getUint16(6, true);

    // Determine expected header size based on version
    let expectedHeaderSize: number;
    if (version <= 4) {
      expectedHeaderSize = this.HEADER_SIZE_V4;
    } else {
      expectedHeaderSize = this.HEADER_SIZE_V5;
    }

    if (view.byteLength < expectedHeaderSize) {
      throw new Error(
        `File too small for v${version} header: need ${expectedHeaderSize} bytes, got ${view.byteLength}`,
      );
    }

    // Validate header size matches version
    if (headerSize !== expectedHeaderSize) {
      throw new Error(
        `Header size mismatch for v${version}: expected ${expectedHeaderSize}, got ${headerSize}`,
      );
    }

    // Parse common header fields
    const sampleCountHeader = view.getUint32(16, true);
    const sampleInterval = view.getUint16(8, true);
    const fieldsMask = view.getUint32(12, true);
    const durationHeader = view.getUint32(20, true);
    const startEpoch = view.getUint32(24, true);
    const profileIdBytes = new Uint8Array(arrayBuffer, 28, 32);
    const profileNameBytes = new Uint8Array(arrayBuffer, 60, 48);
    const finalWeightHeader = view.getUint16(108, true);
    const profileId = this.decodeCString(profileIdBytes);
    const profileName = this.decodeCString(profileNameBytes);

    // Calculate expected sample size from fieldsMask
    const fieldCount = this.countSetBits(fieldsMask);
    const expectedSampleSize = fieldCount * 2; // Each field is 16 bits = 2 bytes

    if (deviceSampleSize !== expectedSampleSize) {
      throw new Error(
        `Field mask indicates ${fieldCount} fields (${expectedSampleSize} bytes), but device reports ${deviceSampleSize} bytes`,
      );
    }

    // Build field layout based on mask (preserves field order)
    const fieldLayout = [];
    for (let bitPos = 0; bitPos < 32; bitPos++) {
      if (fieldsMask & (1 << bitPos)) {
        const fieldDef = this.FIELD_DEFS[bitPos];
        if (fieldDef) {
          fieldLayout.push({ ...fieldDef, bitPos });
        } else {
          // Unknown field - skip but track position
          const fieldSize = 2; // assume uint16 for unknown fields
          fieldLayout.push({
            name: `unknown_${bitPos}`,
            type: 'uint16',
            scale: null,
            bitPos,
            size: fieldSize,
          });
        }
      }
    }

    const samples = [];
    const dataBytes = view.byteLength - headerSize;
    if (dataBytes < 0) {
      throw new Error('Data size misaligned');
    }
    const sampleSize = deviceSampleSize;
    const fullSampleBytes = Math.floor(dataBytes / sampleSize) * sampleSize;
    const trailingBytes = dataBytes - fullSampleBytes;
    const inferredSamples = fullSampleBytes / sampleSize;
    const maxSamples = sampleCountHeader
      ? Math.min(sampleCountHeader, inferredSamples)
      : inferredSamples;

    for (let i = 0; i < maxSamples; i++) {
      const base = headerSize + i * sampleSize;
      const sample = {};

      // Parse each field dynamically
      for (let fieldIdx = 0; fieldIdx < fieldLayout.length; fieldIdx++) {
        const field = fieldLayout[fieldIdx];
        const offset = base + fieldIdx * 2; // Each field is 2 bytes

        let rawValue;
        if (field.type === 'int16') {
          rawValue = view.getInt16(offset, true);
        } else {
          rawValue = view.getUint16(offset, true);
        }

        let finalValue;
        if (field.transform) {
          finalValue = field.transform(rawValue, sampleInterval);
        } else if (field.scale) {
          finalValue = rawValue / field.scale;
        } else {
          finalValue = rawValue;
        }

        sample[field.name] = finalValue;
      }

      samples.push(sample);
    }

    const lastT = samples.length ? samples[samples.length - 1].t : 0;
    const headerIncomplete = sampleCountHeader === 0;
    const inferredIncomplete =
      trailingBytes !== 0 ||
      (sampleCountHeader && sampleCountHeader > inferredSamples);
    const incomplete = headerIncomplete || inferredIncomplete;
    const effectiveDuration =
      !incomplete && durationHeader ? durationHeader : lastT;

    const headerVolume = finalWeightHeader
      ? finalWeightHeader / this.WEIGHT_SCALE
      : 0;
    const sampleVolume = samples.length ? samples[samples.length - 1].v : 0;
    const volume =
      headerVolume > 0 ? headerVolume : sampleVolume > 0 ? sampleVolume : null;

    return {
      id,
      version,
      profile: profileName,
      profileId,
      timestamp: startEpoch,
      duration: effectiveDuration,
      samples,
      volume,
      incomplete,
      sampleInterval,
      fieldsMask,
      trailingBytes,
    };
  }

  /**
   * Filter out deleted entries and convert to frontend format
   * @param {Object} indexData - Parsed index data from parseBinaryIndex
   * @returns {Array} Array of shot objects for frontend use
   */
  public indexToShotList(indexData) {
    return indexData.entries
      .filter((entry) => !entry.deleted)
      .map((entry) => ({
        id: entry.id.toString(),
        profile: entry.profileName,
        profileId: entry.profileId,
        timestamp: entry.timestamp,
        duration: entry.duration,
        samples: 0, // Not available in index, filled when loading full shot
        volume: entry.volume,
        rating: entry.rating > 0 ? entry.rating : null, // Only include rating if > 0
        incomplete: entry.incomplete,
        avgTemp: entry.avgTemp,
        maxPressure: entry.maxPressure,
        avgFlow: entry.avgFlow,
        hasNotes: entry.hasNotes,
        notes: null,
        loaded: false,
        data: null,
      }))
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  }

  private decodeCString(bytes) {
    // Bytes are a null-terminated UTF-8 C string. Decode as UTF-8 — appending
    // String.fromCharCode(byte) treats each byte as a Latin-1 code point, which
    // mangles multibyte characters (e.g. "é" 0xC3 0xA9 -> "Ã©").
    let end = bytes.length;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0) {
        end = i;
        break;
      }
    }
    return new TextDecoder('utf-8').decode(bytes.subarray(0, end));
  }

  private countSetBits(n) {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }
}
