-- Atualiza os dados demonstrativos criados pela primeira versão do MVP.
UPDATE suppliers SET name = 'Têxtil Aurora', email = 'compras@textilaurora.local'
WHERE name = 'Frigorífico Aurora';
UPDATE suppliers SET name = 'Malharia Boa Vista', email = 'contato@malhariaboavista.local'
WHERE name = 'Fazenda Boa Vista';
UPDATE cuts SET description = 'Malha algodão fio 30'
WHERE cut_number = 'COR-001' AND description = 'Alcatra resfriada';
UPDATE cuts SET description = 'Malha poliéster premium'
WHERE cut_number = 'COR-002' AND description = 'Contrafilé premium';
UPDATE cuts SET description = 'Moletom flanelado'
WHERE cut_number = 'COR-003' AND description = 'Picanha peça';
