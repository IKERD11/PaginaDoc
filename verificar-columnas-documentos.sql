-- Script para verificar las columnas actuales de la tabla documentos

SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'documentos'
ORDER BY 
    ordinal_position;
