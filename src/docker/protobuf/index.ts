import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import protobuf, { Root } from 'protobufjs';

let control: Root;
export const loadControl = async () => {
  if (control) {
    return control;
  }

  const path = join(dirname(fileURLToPath(import.meta.url)), './control.proto');
  control = await protobuf.load(path);

  return control;
};

export const decodeBuildkitStatusResponse = async (str: Buffer | string) => {
  const control = await loadControl();
  const buffer =
    typeof str === 'string' ? Buffer.from(str as string, 'base64') : str;

  const uint8 = new Uint8Array(buffer);
  const Trace = control.lookupType('moby.buildkit.v1.StatusResponse');
  const message = Trace.decode(uint8);
  const object = Trace.toObject(message, {
    arrays: true,
    bytes: String,
    defaults: true,
    enums: String,
    longs: String,
    objects: true,
    oneofs: true,
  });

  return object;
};
