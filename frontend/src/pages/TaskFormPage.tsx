import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { taskFormPath } from '../navigation/intents';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import PageContainer from '../components/Common/PageContainer';

/**
 * Legacy /tasks/new route — redirects into the schedule sheet on /tasks.
 */
const TaskFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    navigate(
      taskFormPath({
        fieldId: searchParams.get('fieldId') || undefined,
        templateCode: searchParams.get('templateCode') || undefined,
        proposalId: searchParams.get('proposalId') || undefined,
      }),
      { replace: true }
    );
  }, [navigate, searchParams]);

  return (
    <PageContainer className="tasks-page-container">
      <LoadingSpinner />
    </PageContainer>
  );
};

export default TaskFormPage;
