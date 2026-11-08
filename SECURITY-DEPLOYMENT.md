# Publicação das proteções do Firebase

Estas etapas devem ser executadas pelo proprietário do projeto Firebase. As regras deste repositório só entram em vigor depois da publicação.

## 1. Autorizar a conta administrativa

Defina a custom claim `admin: true` pelo Firebase Admin SDK em um ambiente confiável (Cloud Functions, Cloud Shell ou máquina administrativa). Identifique a conta pelo UID e nunca pelo e-mail informado pelo navegador.

```js
await getAuth().setCustomUserClaims(uid, { admin: true });
```

Nunca coloque uma chave de service account, credenciais do Admin SDK ou segredos neste repositório, no HTML ou no JavaScript do navegador.

Depois de alterar a claim, encerre a sessão administrativa e entre novamente. Isso força a emissão de um token novo. Para revogar o acesso, remova a claim no mesmo ambiente confiável e revogue os refresh tokens da conta.

## 2. Publicar as regras

Confirme que a CLI está autenticada no projeto `leme-catalogo` e publique apenas as regras:

```sh
firebase use leme-catalogo
firebase deploy --only firestore:rules
```

## 3. Verificar após a publicação

Use dados descartáveis e confirme estes três casos:

1. Uma sessão anônima consegue ler `produtos`.
2. Uma conta autenticada sem `admin: true` recebe `permission-denied` ao criar, editar ou excluir um produto.
3. A conta administrativa com token renovado consegue criar, editar e excluir um produto de teste que respeite o esquema e os limites das regras.

Apague o produto de teste ao terminar. Também confirme que documentos fora de `produtos` não podem ser lidos nem gravados pelo cliente.

## 4. Reversão

Se a publicação impedir uma operação legítima, restaure a versão anterior conhecida de `firestore.rules` pelo Git e publique novamente com `firebase deploy --only firestore:rules`. Não substitua temporariamente as regras por acesso público. Registre o erro observado antes da reversão para que a regra possa ser corrigida e testada offline.
