import React, { useState, useEffect } from 'react';

const Supervision = () => {
    const [supervisions, setSupervisions] = useState([]);
    const [plans, setPlans] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('2025-10-29');
    const [showForm, setShowForm] = useState(false); // Estado para mostrar/ocultar el formulario
    const [newPlan, setNewPlan] = useState({
        guard: '',
        shift: '',
        frequency: '',
        startTime: '',
        schedule: '',
    });

    // Simulando la carga de datos desde una API o base de datos
    useEffect(() => {
        setSupervisions([
            { date: '29/10/2025', guard: 'Juan Pérez', shift: 'Mañana', score: 90, status: 'Activo', supervisor: 'Supervisor A' },
            { date: '30/10/2025', guard: 'María González', shift: 'Tarde', score: 85, status: 'Activo', supervisor: 'Supervisor B' },
        ]);
        setPlans([
            { guard: 'Juan Pérez', shift: 'Mañana', frequency: 'Diaria', schedule: '08:00 - 16:00', status: 'Activo' },
            { guard: 'María González', shift: 'Tarde', frequency: 'Semanal', schedule: '16:00 - 00:00', status: 'Activo' },
        ]);
    }, []);

    const filteredSupervisions = supervisions.filter((supervision) => {
        const matchesName = supervision.guard.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = supervision.date === filterDate;
        return matchesName && matchesDate;
    });

    // Función para manejar el envío del formulario de creación de plan
    const handleCreatePlan = () => {
        setPlans([...plans, newPlan]); // Añadir el nuevo plan a la lista
        setShowForm(false); // Ocultar el formulario después de crear el plan
        setNewPlan({
            guard: '',
            shift: '',
            frequency: '',
            startTime: '',
            schedule: '',
        }); // Resetear el formulario
    };

    // Estilos en línea dentro del archivo JSX
    const styles = {
        container: {
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '20px',
            color: '#f2f2f2',  // Color de texto claro para combinar con el fondo oscuro
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#005f91',
            color: '#f2f2f2',  // Blanco para el texto
            padding: '15px',
            borderRadius: '8px',
        },
        headerActions: {
            display: 'flex',
            alignItems: 'center',
        },
        input: {
            padding: '8px',
            marginRight: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#2c3e50',  // Fondo oscuro para el input
            color: '#f2f2f2',  // Color del texto dentro del input
        },
        btnNew: {
            backgroundColor: '#27ae60',  // Botón verde
            color: '#f2f2f2',  // Texto blanco en el botón
            padding: '10px 20px',
            borderRadius: '5px',
            border: 'none',
            cursor: 'pointer',
        },
        supervisionSection: {
            marginTop: '20px',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#34495e',  // Fondo gris oscuro para la tabla
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
        },
        thTd: {
            padding: '12px',
            textAlign: 'center',
            border: '1px solid #ddd',
            color: '#ecf0f1',  // Color de texto gris claro para las celdas de la tabla
        },
        button: {
            padding: '8px 12px',
            margin: '5px',
            backgroundColor: '#4CAF50',  // Verde para los botones de acción
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
        },
        buttonHover: {
            backgroundColor: '#45a049',
        },
        // Estilos para el modal
        modal: {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fondo semitransparente
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '9999',
        },
        modalContent: {
            backgroundColor: '#34495e',
            padding: '20px',
            borderRadius: '8px',
            width: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        },
        formInput: {
            padding: '8px',
            margin: '5px 0',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#2c3e50',
            color: '#f2f2f2',
        },
        formButton: {
            backgroundColor: '#27ae60',
            color: '#f2f2f2',
            padding: '10px 20px',
            borderRadius: '5px',
            border: 'none',
            cursor: 'pointer',
        },
        closeButton: {
            backgroundColor: '#e74c3c',
            color: '#f2f2f2',
            padding: '10px 20px',
            borderRadius: '5px',
            border: 'none',
            cursor: 'pointer',
            alignSelf: 'flex-end',
        },
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1>Sistema de Supervisión de Seguridad</h1>
                <div style={styles.headerActions}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        id="searchGuard"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.input}
                    />
                    <input
                        type="date"
                        id="dateFilter"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        style={styles.input}
                    />
                    <button style={styles.btnNew} onClick={() => setShowForm(true)}>
                        Nueva Supervisión
                    </button>
                </div>
            </header>

            <section style={styles.supervisionSection}>
                <h2>Supervisión de Guardias</h2>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.thTd}>Fecha</th>
                            <th style={styles.thTd}>Guardia</th>
                            <th style={styles.thTd}>Área de Turno</th>
                            <th style={styles.thTd}>Puntaje</th>
                            <th style={styles.thTd}>Estado</th>
                            <th style={styles.thTd}>Supervisor</th>
                            <th style={styles.thTd}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="supervisionList">
                        {filteredSupervisions.map((supervision, index) => (
                            <tr key={index}>
                                <td style={styles.thTd}>{supervision.date}</td>
                                <td style={styles.thTd}>{supervision.guard}</td>
                                <td style={styles.thTd}>{supervision.shift}</td>
                                <td style={styles.thTd}>{supervision.score}</td>
                                <td style={styles.thTd}>{supervision.status}</td>
                                <td style={styles.thTd}>{supervision.supervisor}</td>
                                <td style={styles.thTd}>
                                    <button style={styles.button}>Ver</button>
                                    <button style={styles.button}>Editar</button>
                                    <button style={styles.button}>Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section style={styles.supervisionSection}>
                <h2>Planes de Supervisión</h2>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.thTd}>Guardia</th>
                            <th style={styles.thTd}>Turno</th>
                            <th style={styles.thTd}>Frecuencia</th>
                            <th style={styles.thTd}>Programación</th>
                            <th style={styles.thTd}>Estado</th>
                            <th style={styles.thTd}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="plansList">
                        {plans.map((plan, index) => (
                            <tr key={index}>
                                <td style={styles.thTd}>{plan.guard}</td>
                                <td style={styles.thTd}>{plan.shift}</td>
                                <td style={styles.thTd}>{plan.frequency}</td>
                                <td style={styles.thTd}>{plan.schedule}</td>
                                <td style={styles.thTd}>{plan.status}</td>
                                <td style={styles.thTd}>
                                    <button style={styles.button}>Editar</button>
                                    <button style={styles.button}>Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button style={styles.btnNew} onClick={() => setShowForm(true)}>
                    Crear Plan
                </button>
            </section>

            {/* Modal para el formulario de creación de plan */}
            {showForm && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <button style={styles.closeButton} onClick={() => setShowForm(false)}>
                            Cerrar
                        </button>
                        <h3>Crear Plan</h3>
                        <input
                            type="text"
                            placeholder="Guardia"
                            value={newPlan.guard}
                            onChange={(e) => setNewPlan({ ...newPlan, guard: e.target.value })}
                            style={styles.formInput}
                        />
                        <input
                            type="text"
                            placeholder="Turno"
                            value={newPlan.shift}
                            onChange={(e) => setNewPlan({ ...newPlan, shift: e.target.value })}
                            style={styles.formInput}
                        />
                        <input
                            type="text"
                            placeholder="Frecuencia"
                            value={newPlan.frequency}
                            onChange={(e) => setNewPlan({ ...newPlan, frequency: e.target.value })}
                            style={styles.formInput}
                        />
                        <input
                            type="time"
                            value={newPlan.startTime}
                            onChange={(e) => setNewPlan({ ...newPlan, startTime: e.target.value })}
                            style={styles.formInput}
                        />
                        <input
                            type="text"
                            placeholder="Programación"
                            value={newPlan.schedule}
                            onChange={(e) => setNewPlan({ ...newPlan, schedule: e.target.value })}
                            style={styles.formInput}
                        />
                        <button style={styles.formButton} onClick={handleCreatePlan}>
                            Crear Plan
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Supervision;
