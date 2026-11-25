-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('CLIENTE', 'VENDEDOR', 'DONO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "telefone" TEXT,
    "endereco" TEXT,
    "perfil" "Perfil" NOT NULL DEFAULT 'CLIENTE',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "fotoUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variacao" (
    "id" SERIAL NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "tamanho" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "estoque" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Variacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoItem" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "variacaoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "precoUnitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PedidoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Variacao_produtoId_tamanho_cor_key" ON "Variacao"("produtoId", "tamanho", "cor");

-- CreateIndex
CREATE INDEX "Pedido_criadoEm_idx" ON "Pedido"("criadoEm");

-- AddForeignKey
ALTER TABLE "Variacao" ADD CONSTRAINT "Variacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_variacaoId_fkey" FOREIGN KEY ("variacaoId") REFERENCES "Variacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
