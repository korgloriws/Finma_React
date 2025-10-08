# ==================== OTIMIZAÇÕES PARA PRODUÇÃO ====================

import asyncio
from functools import wraps
from typing import List, Dict, Any
import time

# Cache de queries frequentes
QUERY_CACHE = {}
CACHE_TTL = 300  # 5 minutos

def cache_query(ttl: int = 300):
    """Decorator para cache de queries PostgreSQL"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Gerar chave de cache
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Verificar cache
            if cache_key in QUERY_CACHE:
                cached_data, timestamp = QUERY_CACHE[cache_key]
                if time.time() - timestamp < ttl:
                    return cached_data
            
            # Executar query
            result = await func(*args, **kwargs)
            
            # Armazenar no cache
            QUERY_CACHE[cache_key] = (result, time.time())
            
            return result
        return wrapper
    return decorator

# ==================== OTIMIZAÇÕES DE QUERY ====================

class DatabaseOptimizer:
    """Otimizador de queries para PostgreSQL"""
    
    @staticmethod
    def optimize_carteira_query(usuario: str) -> str:
        """Query otimizada para carteira"""
        return """
        SELECT 
            a.ticker,
            a.quantidade,
            a.preco_medio,
            a.valor_total,
            a.tipo,
            a.indexador,
            COALESCE(p.preco_atual, a.preco_medio) as preco_atual
        FROM carteira a
        LEFT JOIN precos p ON a.ticker = p.ticker
        WHERE a.usuario = %s
        ORDER BY a.valor_total DESC
        """
    
    @staticmethod
    def optimize_historico_query(usuario: str, periodo: str) -> str:
        """Query otimizada para histórico"""
        return """
        SELECT 
            DATE_TRUNC('day', data) as data,
            SUM(valor_total) as valor_total
        FROM historico_carteira
        WHERE usuario = %s 
        AND data >= NOW() - INTERVAL '%s'
        GROUP BY DATE_TRUNC('day', data)
        ORDER BY data
        """
    
    @staticmethod
    def optimize_resumo_query(usuario: str, mes: int, ano: int) -> str:
        """Query otimizada para resumo"""
        return """
        SELECT 
            'receitas' as tipo,
            SUM(valor) as total,
            COUNT(*) as registros
        FROM receitas 
        WHERE usuario = %s AND mes = %s AND ano = %s
        
        UNION ALL
        
        SELECT 
            'despesas' as tipo,
            SUM(valor) as total,
            COUNT(*) as registros  
        FROM despesas
        WHERE usuario = %s AND mes = %s AND ano = %s
        """

# ==================== CONNECTION POOLING ====================

class ConnectionPool:
    """Pool de conexões otimizado"""
    
    def __init__(self, min_connections: int = 5, max_connections: int = 20):
        self.min_connections = min_connections
        self.max_connections = max_connections
        self.available_connections = []
        self.active_connections = 0
    
    async def get_connection(self):
        """Obter conexão do pool"""
        if self.available_connections:
            return self.available_connections.pop()
        
        if self.active_connections < self.max_connections:
            # Criar nova conexão
            conn = await self.create_connection()
            self.active_connections += 1
            return conn
        
        # Aguardar conexão disponível
        await asyncio.sleep(0.1)
        return await self.get_connection()
    
    async def return_connection(self, conn):
        """Retornar conexão ao pool"""
        if len(self.available_connections) < self.min_connections:
            self.available_connections.append(conn)
        else:
            await conn.close()
            self.active_connections -= 1

# ==================== QUERY BATCHING ====================

class QueryBatcher:
    """Agrupador de queries para reduzir round-trips"""
    
    def __init__(self):
        self.pending_queries = []
        self.batch_size = 5
        self.batch_delay = 50  # ms
    
    async def add_query(self, query: str, params: tuple):
        """Adicionar query ao batch"""
        self.pending_queries.append((query, params))
        
        if len(self.pending_queries) >= self.batch_size:
            return await self.execute_batch()
        
        # Executar após delay
        await asyncio.sleep(self.batch_delay / 1000)
        return await self.execute_batch()
    
    async def execute_batch(self):
        """Executar batch de queries"""
        if not self.pending_queries:
            return []
        
        queries = self.pending_queries.copy()
        self.pending_queries.clear()
        
        # Executar queries em paralelo
        results = await asyncio.gather(*[
            self.execute_single_query(query, params)
            for query, params in queries
        ])
        
        return results

# ==================== MONITORING ====================

class PerformanceMonitor:
    """Monitor de performance para produção"""
    
    def __init__(self):
        self.query_times = {}
        self.slow_queries = []
        self.cache_hits = 0
        self.cache_misses = 0
    
    def log_query_time(self, query_name: str, duration: float):
        """Log tempo de execução de query"""
        if query_name not in self.query_times:
            self.query_times[query_name] = []
        
        self.query_times[query_name].append(duration)
        
        # Identificar queries lentas
        if duration > 1.0:  # > 1 segundo
            self.slow_queries.append({
                'query': query_name,
                'duration': duration,
                'timestamp': time.time()
            })
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Obter estatísticas de performance"""
        stats = {}
        
        for query_name, times in self.query_times.items():
            stats[query_name] = {
                'avg_time': sum(times) / len(times),
                'max_time': max(times),
                'min_time': min(times),
                'count': len(times)
            }
        
        stats['cache_hit_rate'] = self.cache_hits / (self.cache_hits + self.cache_misses) if (self.cache_hits + self.cache_misses) > 0 else 0
        stats['slow_queries'] = self.slow_queries[-10:]  # Últimas 10 queries lentas
        
        return stats

# ==================== CONFIGURAÇÕES PARA RENDER ====================

RENDER_OPTIMIZATIONS = {
    'database': {
        'connection_pool_size': 10,
        'max_connections': 20,
        'query_timeout': 30,
        'idle_timeout': 300
    },
    'cache': {
        'ttl': 300,  # 5 minutos
        'max_size': 1000,
        'cleanup_interval': 600  # 10 minutos
    },
    'monitoring': {
        'slow_query_threshold': 1.0,  # 1 segundo
        'performance_log_interval': 3600  # 1 hora
    }
}
