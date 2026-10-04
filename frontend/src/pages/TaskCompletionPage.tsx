import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/** Older links land on the work screen, where completion is confirmed. */
const TaskCompletionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/tasks/${id}` : '/tasks'} replace />;
};

export default TaskCompletionPage;
