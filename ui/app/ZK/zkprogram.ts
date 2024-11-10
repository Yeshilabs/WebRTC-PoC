import {
    Field,
    ZkProgram,
    verify,
    Proof,
    JsonProof,
    Provable,
    Empty,
    Poseidon,
  } from 'o1js';
  
  export {generateBaseCaseProof};
  
  let MyProgram = ZkProgram({
    name: 'example-with-output',
    publicOutput: Field,
  
    methods: {
      baseCase: {
        privateInputs: [],
        async method() {
          return Field(0);
        },
      },
  
      inductiveCase: {
        privateInputs: [],
        async method() {
            return Field(1);
        },
      },
    },
  });
  
  const MyProof = ZkProgram.Proof(MyProgram);
  
  const generateBaseCaseProof = async () => {
        console.log("compiling program");
        await MyProgram.compile();
        console.log("program compiled");
        const proof = await MyProgram.baseCase();
        console.log("generated proof");
        const proofJSON = proof.toJSON();
        return proofJSON;
}