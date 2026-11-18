import useAuth from '../../hooks/useAuth';
import { usePerfilActivo } from '../../context/PerfilContext';
import { esAdmin, PERFIL } from '../../config/roles';

/**
 * true si la persona está comprando (perfil activo = comprador): entonces ve
 * la tienda (encabezado con buscador, sin menú lateral) en lugar del panel de
 * gestión. Mientras se cargan los perfiles se usa el último perfil activo
 * guardado, para que la pantalla no cambie de marco al terminar de cargar.
 */
export function useModoTienda() {
  const { user } = useAuth();
  const { perfilActivo, loading } = usePerfilActivo();
  if (esAdmin(user)) return false;
  if (loading && !perfilActivo) {
    try {
      return Number(localStorage.getItem('perfil_activo')) === PERFIL.COMPRADOR;
    } catch {
      return false;
    }
  }
  return Number(perfilActivo?.id_perfil) === PERFIL.COMPRADOR;
}

export default useModoTienda;
