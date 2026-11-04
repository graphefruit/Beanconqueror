import { BinaryWriter } from '@bufbuild/protobuf/wire';

import { BeanProto } from '../../../generated/src/classes/bean/bean';
import { Bean } from '../bean';

describe('Bean shared protobuf', () => {
  it('preserves half-step roast ratings', () => {
    const bytes = BeanProto.encode({
      name: 'Test bean',
      roast_range: 2.5,
      attachments: [],
      bean_information: [],
      external_images: [],
    }).finish();

    const bean = new Bean();
    bean.initializeBySharedProtoBean(BeanProto.decode(bytes));

    expect(bean.roast_range).toBe(2.5);
  });

  it('reads a legacy integer-encoded roast rating', () => {
    const bytes = new BinaryWriter().uint32(64).uint64(3).finish();

    const bean = new Bean();
    bean.initializeBySharedProtoBean(BeanProto.decode(bytes));

    expect(bean.roast_range).toBe(3);
  });
});
