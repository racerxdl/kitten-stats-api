function atob(a: any) {
  return new Buffer(a, 'base64').toString('binary');
}
function btoa(b: any) {
  return new Buffer(b).toString('base64');
}

if (!globalThis.atob) {
  globalThis.atob = atob;
  globalThis.btoa = btoa;
}