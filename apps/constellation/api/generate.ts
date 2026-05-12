import handlerV2 from "./generateV2";

export const config = {
  runtime: 'edge',
};

// Router d'API interne redirigeant vers la V2 pour la constellation
export default handlerV2;
