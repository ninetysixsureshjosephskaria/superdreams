import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { NetworkRelationshipsCard } from '@/features/network';
import { useNotificationStore } from '@/store';
import type { MemberDetail } from '@superdreams/api-client';
import {
  Alert,
  Button,
  ContentCard,
  DropdownMenu,
  EmptyState,
  Icon,
  Input,
  LoadingScreen,
  Spinner,
  Tabs,
  Textarea,
} from '@superdreams/ui';

import { AccountStatusCard } from '../components/AccountStatusCard';
import { MemberStatusBadge } from '../components/MemberStatusBadge';
import {
  useAddMemberDocument,
  useAddMemberNote,
  useArchiveMember,
  useChangeMemberStatus,
  useMember,
  useMemberActivity,
  useMemberDocuments,
  useMemberNotes,
  useMemberStatusHistory,
} from '../hooks';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

function OverviewPanel({ member }: { member: MemberDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ContentCard title="Personal information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" value={member.firstName} />
          <Field label="Last name" value={member.lastName} />
          <Field label="Member number" value={member.memberNumber} />
          <Field label="Date of birth" value={member.profile?.dateOfBirth ?? ''} />
          <Field label="Gender" value={member.profile?.gender ?? ''} />
          <Field label="Joined" value={new Date(member.joinedAt).toLocaleDateString()} />
        </div>
        {member.profile?.bio ? (
          <p className="mt-4 text-sm text-muted-foreground">{member.profile.bio}</p>
        ) : null}
      </ContentCard>
      <ContentCard title="Contact information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" value={member.email} />
          <Field label="Phone" value={member.phone ?? ''} />
        </div>
        {member.contacts.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {member.contacts.map((contact) => (
              <li key={contact.id}>
                <span className="text-muted-foreground">{contact.type}:</span> {contact.value}
              </li>
            ))}
          </ul>
        ) : null}
        {member.addresses.length > 0 ? (
          <div className="mt-4 space-y-2 text-sm">
            {member.addresses.map((address) => (
              <p key={address.id}>
                {address.line1}, {address.city}, {address.country}
              </p>
            ))}
          </div>
        ) : null}
      </ContentCard>
    </div>
  );
}

function ActivityPanel({ id }: { id: string }) {
  const query = useMemberActivity(id);
  if (query.isPending) {
    return <Spinner label="Loading activity" />;
  }
  if (!query.data || query.data.length === 0) {
    return <EmptyState title="No activity yet" description="Actions on this member appear here." />;
  }
  return (
    <ul className="space-y-3">
      {query.data.map((entry) => (
        <li key={entry.id} className="flex items-start gap-3 text-sm">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon name="info" size="xs" />
          </span>
          <div>
            <p className="font-medium">{entry.description ?? entry.action}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(entry.createdAt).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function NotesPanel({ id }: { id: string }) {
  const query = useMemberNotes(id);
  const addNote = useAddMemberNote(id);
  const [body, setBody] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea
          rows={2}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
          }}
          placeholder="Add a note…"
          className="flex-1"
        />
        <Button
          isLoading={addNote.isPending}
          disabled={!body.trim()}
          onClick={() => {
            addNote.mutate(
              { body: body.trim() },
              {
                onSuccess: () => {
                  setBody('');
                },
              },
            );
          }}
        >
          Add
        </Button>
      </div>
      {query.isPending ? (
        <Spinner label="Loading notes" />
      ) : query.data && query.data.length > 0 ? (
        <ul className="space-y-3">
          {query.data.map((note) => (
            <li key={note.id} className="rounded-md border p-3 text-sm">
              <p>{note.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No notes" description="Add the first administrative note." />
      )}
    </div>
  );
}

function DocumentsPanel({ id }: { id: string }) {
  const query = useMemberDocuments(id);
  const addDocument = useAddMemberDocument(id);
  const [name, setName] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="Document name (metadata only)…"
          className="flex-1"
        />
        <Button
          isLoading={addDocument.isPending}
          disabled={!name.trim()}
          onClick={() => {
            addDocument.mutate(
              { name: name.trim() },
              {
                onSuccess: () => {
                  setName('');
                },
              },
            );
          }}
        >
          Add
        </Button>
      </div>
      {query.isPending ? (
        <Spinner label="Loading documents" />
      ) : query.data && query.data.length > 0 ? (
        <ul className="divide-y">
          {query.data.map((document) => (
            <li key={document.id} className="flex items-center justify-between py-2 text-sm">
              <span className="flex items-center gap-2">
                <Icon name="receipt" size="sm" className="text-muted-foreground" />
                {document.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(document.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No documents" description="Document metadata appears here." />
      )}
    </div>
  );
}

function HistoryPanel({ id }: { id: string }) {
  const query = useMemberStatusHistory(id);
  if (query.isPending) {
    return <Spinner label="Loading history" />;
  }
  if (!query.data || query.data.length === 0) {
    return <EmptyState title="No status history" description="Status changes appear here." />;
  }
  return (
    <ul className="space-y-3 text-sm">
      {query.data.map((entry) => (
        <li key={entry.id} className="rounded-md border p-3">
          <p className="font-medium">
            {entry.fromStatus ? `${entry.fromStatus} → ` : ''}
            {entry.toStatus}
          </p>
          {entry.reason ? <p className="text-muted-foreground">{entry.reason}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(entry.createdAt).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Admin member details with overview + activity/notes/documents/history tabs. */
export default function MemberDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const memberQuery = useMember(id);
  const changeStatus = useChangeMemberStatus(id);
  const archive = useArchiveMember();

  if (memberQuery.isPending) {
    return <LoadingScreen message="Loading member…" />;
  }
  if (memberQuery.isError || !memberQuery.data) {
    return (
      <Alert variant="destructive" title="Could not load member">
        {memberQuery.error?.message ?? 'The member could not be found.'}
      </Alert>
    );
  }

  const member = memberQuery.data;

  const setStatus = (status: MemberDetail['status'], label: string): void => {
    changeStatus.mutate(
      { status },
      {
        onSuccess: () => {
          notify({ variant: 'success', title: `Member ${label}` });
        },
        onError: (error) => {
          notify({ variant: 'error', title: 'Status change failed', description: error.message });
        },
      },
    );
  };

  return (
    <>
      <Helmet>
        <title>{member.fullName}</title>
      </Helmet>
      <PageHeader
        title={member.fullName}
        description={member.email}
        actions={
          <div className="flex items-center gap-2">
            <MemberStatusBadge status={member.status} />
            <Button
              variant="outline"
              leftIcon={<Icon name="edit" size="sm" />}
              onClick={() => navigate(`/members/${member.id}/edit`)}
            >
              Edit
            </Button>
            <DropdownMenu
              align="end"
              triggerClassName="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              trigger={
                <>
                  <Icon name="more-horizontal" size="sm" />
                  <span className="sr-only">Member actions</span>
                </>
              }
              items={[
                {
                  label: 'Activate',
                  icon: <Icon name="check-circle" size="sm" />,
                  disabled: member.status === 'ACTIVE',
                  onSelect: () => {
                    setStatus('ACTIVE', 'activated');
                  },
                },
                {
                  label: 'Suspend',
                  icon: <Icon name="alert-triangle" size="sm" />,
                  disabled: member.status === 'SUSPENDED' || member.status === 'ARCHIVED',
                  onSelect: () => {
                    setStatus('SUSPENDED', 'suspended');
                  },
                },
                {
                  label: 'Archive',
                  icon: <Icon name="trash" size="sm" />,
                  destructive: true,
                  onSelect: () => {
                    archive.mutate(member.id, {
                      onSuccess: () => {
                        notify({ variant: 'success', title: 'Member archived' });
                        navigate('/members');
                      },
                    });
                  },
                },
              ]}
            />
          </div>
        }
      />

      <Tabs
        items={[
          {
            value: 'overview',
            label: 'Overview',
            content: (
              <div className="space-y-4">
                <OverviewPanel member={member} />
                <AccountStatusCard id={member.id} />
                <NetworkRelationshipsCard memberId={member.id} />
              </div>
            ),
          },
          { value: 'activity', label: 'Activity', content: <ActivityPanel id={member.id} /> },
          { value: 'notes', label: 'Notes', content: <NotesPanel id={member.id} /> },
          { value: 'documents', label: 'Documents', content: <DocumentsPanel id={member.id} /> },
          { value: 'history', label: 'Status history', content: <HistoryPanel id={member.id} /> },
        ]}
      />
    </>
  );
}
