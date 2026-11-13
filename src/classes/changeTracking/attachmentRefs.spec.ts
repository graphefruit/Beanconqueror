import { REFERENCE_GRAPH_TYPE } from '../../enums/brews/referenceGraphType';
import {
  collectAttachmentRefs,
  mimeFromPath,
  resolveForStat,
} from './attachmentRefs';

describe('attachmentRefs', () => {
  describe('collectAttachmentRefs', () => {
    it('lists the photos of every collection with attachments', () => {
      for (const collection of [
        'BEANS',
        'BREWS',
        'MILL',
        'PREPARATION',
        'WATER',
        'GREEN_BEANS',
        'ROASTING_MACHINES',
        'BARISTAMODE_BREWS',
      ]) {
        expect(
          collectAttachmentRefs(collection, {
            config: { uuid: 'a' },
            attachments: ['photo_1.jpg', '/photo_2.png'],
          }),
        )
          .withContext(collection)
          .toEqual([
            { path: 'photo_1.jpg', kind: 'photo' },
            { path: '/photo_2.png', kind: 'photo' },
          ]);
      }
    });

    it('lists the flow profile and the imported reference graph of a brew', () => {
      const refs = collectAttachmentRefs('BREWS', {
        config: { uuid: 'brew-1' },
        attachments: [],
        flow_profile: 'brews/brew-1_flow_profile.json',
        reference_flow_profile: {
          type: REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH,
          uuid: 'brew-1',
        },
      });

      expect(refs).toEqual([
        { path: 'brews/brew-1_flow_profile.json', kind: 'brew_flow_profile' },
        {
          path: 'importedGraph/brew-1_flow_profile.json',
          kind: 'imported_flow_profile',
        },
      ]);
    });

    it('lists no imported graph for other reference graph types', () => {
      for (const type of [
        REFERENCE_GRAPH_TYPE.NONE,
        REFERENCE_GRAPH_TYPE.BREW,
        REFERENCE_GRAPH_TYPE.GRAPH,
      ]) {
        expect(
          collectAttachmentRefs('BREWS', {
            config: { uuid: 'brew-1' },
            reference_flow_profile: { type, uuid: 'other' },
          }),
        )
          .withContext(type)
          .toEqual([]);
      }
    });

    it('lists the flow profiles of graphs and barista mode brews', () => {
      expect(
        collectAttachmentRefs('GRAPH', {
          config: { uuid: 'g' },
          flow_profile: 'graphs/g.json',
        }),
      ).toEqual([{ path: 'graphs/g.json', kind: 'graph_flow_profile' }]);
      expect(
        collectAttachmentRefs('BARISTAMODE_BREWS', {
          config: { uuid: 'b' },
          flow_profile: 'baristamode/b.json',
          reference_flow_profile: { type: REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH },
        }),
      ).toEqual([
        { path: 'baristamode/b.json', kind: 'baristamode_flow_profile' },
      ]);
    });

    it('ignores flow profiles of other collections and photos of graphs', () => {
      expect(
        collectAttachmentRefs('BEANS', {
          config: { uuid: 'a' },
          flow_profile: 'beans/a.json',
        }),
      ).toEqual([]);
      expect(
        collectAttachmentRefs('GRAPH', {
          config: { uuid: 'g' },
          attachments: ['photo.jpg'],
        }),
      ).toEqual([]);
    });

    it('lists every path once', () => {
      expect(
        collectAttachmentRefs('BREWS', {
          config: { uuid: 'a' },
          attachments: ['photo.jpg', 'photo.jpg'],
          flow_profile: 'photo.jpg',
        }),
      ).toEqual([{ path: 'photo.jpg', kind: 'photo' }]);
    });

    it('skips empty and invalid values', () => {
      expect(
        collectAttachmentRefs('BREWS', {
          config: { uuid: 'a' },
          attachments: ['', '  ', null, undefined, 5, {}, 'ok.jpg'],
          flow_profile: '',
        }),
      ).toEqual([{ path: 'ok.jpg', kind: 'photo' }]);
      expect(
        collectAttachmentRefs('BEANS', { attachments: 'photo.jpg' }),
      ).toEqual([]);
      expect(collectAttachmentRefs('BEANS', null)).toEqual([]);
      expect(collectAttachmentRefs('BEANS', undefined)).toEqual([]);
      expect(
        collectAttachmentRefs('BREWS', {
          reference_flow_profile: { type: REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH },
        }),
      ).toEqual([]);
    });
  });

  describe('mimeFromPath', () => {
    it('takes the type from the extension', () => {
      expect(mimeFromPath('a.jpg')).toBe('image/jpeg');
      expect(mimeFromPath('a.JPEG')).toBe('image/jpeg');
      expect(mimeFromPath('dir/a.png')).toBe('image/png');
      expect(mimeFromPath('a.heic')).toBe('image/heic');
      expect(mimeFromPath('brews/a_flow_profile.json')).toBe(
        'application/json',
      );
    });

    it('falls back for unknown or missing extensions', () => {
      expect(mimeFromPath('a.gif')).toBe('application/octet-stream');
      expect(mimeFromPath('noextension')).toBe('application/octet-stream');
      expect(mimeFromPath('dir.jpg/file')).toBe('application/octet-stream');
    });
  });

  describe('resolveForStat', () => {
    it('leaves out a leading slash', () => {
      expect(resolveForStat('/photo.jpg', false)).toEqual({
        path: 'photo.jpg',
        absolute: false,
      });
      expect(resolveForStat('photo.jpg', true)).toEqual({
        path: 'photo.jpg',
        absolute: false,
      });
    });

    it('leaves out the Cloud folder only on iOS', () => {
      expect(resolveForStat('Cloud/photo.jpg', true)).toEqual({
        path: 'photo.jpg',
        absolute: false,
      });
      expect(resolveForStat('/Cloud/photo.jpg', true)).toEqual({
        path: 'photo.jpg',
        absolute: false,
      });
      expect(resolveForStat('Cloud/photo.jpg', false)).toEqual({
        path: 'Cloud/photo.jpg',
        absolute: false,
      });
    });

    it('checks absolute file URIs as they are', () => {
      const uri = 'file:///var/mobile/Containers/Data/photo.jpg';
      expect(resolveForStat(uri, true)).toEqual({ path: uri, absolute: true });
    });
  });
});
