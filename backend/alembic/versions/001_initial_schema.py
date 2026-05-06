"""Initial schema - create all core tables.

Revision ID: 001_initial_schema
Revises:
Create Date: 2025-12-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE backgroundtype AS ENUM ('cs_student', 'me_student', 'ee_student', 'hobbyist', 'professional', 'other')")
    op.execute("CREATE TYPE experiencelevel AS ENUM ('none', 'beginner', 'intermediate', 'advanced')")
    op.execute("CREATE TYPE userrole AS ENUM ('student', 'author', 'admin')")
    op.execute("CREATE TYPE chapterstatus AS ENUM ('draft', 'published', 'archived')")
    op.execute("CREATE TYPE messagerole AS ENUM ('user', 'assistant', 'system')")
    op.execute("CREATE TYPE contextmode AS ENUM ('full_book', 'selected_text', 'chapter')")
    op.execute("CREATE TYPE questiontype AS ENUM ('multiple_choice', 'true_false', 'short_answer')")
    op.execute("CREATE TYPE translationstatus AS ENUM ('pending', 'in_progress', 'completed', 'failed')")

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('display_name', sa.String(100)),
        sa.Column('background_type', postgresql.ENUM('cs_student', 'me_student', 'ee_student', 'hobbyist', 'professional', 'other', name='backgroundtype', create_type=False)),
        sa.Column('background_other', sa.Text),
        sa.Column('software_experience', postgresql.ENUM('none', 'beginner', 'intermediate', 'advanced', name='experiencelevel', create_type=False)),
        sa.Column('hardware_experience', postgresql.ENUM('none', 'beginner', 'intermediate', 'advanced', name='experiencelevel', create_type=False)),
        sa.Column('learning_goals', sa.Text),
        sa.Column('preferred_language', sa.String(10), server_default='en'),
        sa.Column('role', postgresql.ENUM('student', 'author', 'admin', name='userrole', create_type=False), server_default='student'),
        sa.Column('oauth_provider', sa.String(50)),
        sa.Column('oauth_id', sa.String(255)),
        sa.Column('avatar_url', sa.String(500)),
        sa.Column('email_verified', sa.Boolean, server_default='false'),
        sa.Column('last_login_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_users_oauth', 'users', ['oauth_provider', 'oauth_id'], unique=True, postgresql_where=sa.text('oauth_provider IS NOT NULL'))

    # Create sessions table
    op.create_table(
        'sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('token_hash', sa.String(255), nullable=False, index=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('user_agent', sa.Text),
        sa.Column('ip_address', postgresql.INET),
        sa.Column('is_valid', sa.Boolean, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Create chapters table
    op.create_table(
        'chapters',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('course_id', sa.String(50), nullable=False, server_default='physical-ai-robotics'),
        sa.Column('week_number', sa.Integer, nullable=False),
        sa.Column('module_number', sa.Integer, nullable=False),
        sa.Column('chapter_number', sa.Integer, nullable=False),
        sa.Column('slug', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('word_count', sa.Integer),
        sa.Column('estimated_read_time', sa.Integer),
        sa.Column('status', postgresql.ENUM('draft', 'published', 'archived', name='chapterstatus', create_type=False), server_default='draft'),
        sa.Column('published_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_chapters_hierarchy', 'chapters', ['course_id', 'week_number', 'module_number', 'chapter_number'])

    # Create content_chunks table
    op.create_table(
        'contentchunks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chapters.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('chunk_index', sa.Integer, nullable=False),
        sa.Column('section_title', sa.String(255)),
        sa.Column('content_text', sa.Text, nullable=False),
        sa.Column('content_type', sa.String(50), server_default='paragraph'),
        sa.Column('token_count', sa.Integer),
        sa.Column('qdrant_point_id', postgresql.UUID(as_uuid=True)),
        sa.Column('embedded_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('chapter_id', 'chunk_index', name='uq_chunk_chapter_index'),
    )

    # Create reading_progress table
    op.create_table(
        'readingprogress',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chapters.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('scroll_position', sa.Float, server_default='0'),
        sa.Column('completed', sa.Boolean, server_default='false'),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('total_time_seconds', sa.Integer, server_default='0'),
        sa.Column('last_accessed_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('user_id', 'chapter_id', name='uq_reading_progress_user_chapter'),
    )

    # Create conversations table
    op.create_table(
        'conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chapters.id', ondelete='SET NULL'), index=True),
        sa.Column('title', sa.String(255)),
        sa.Column('is_active', sa.Boolean, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Create messages table
    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('role', postgresql.ENUM('user', 'assistant', 'system', name='messagerole', create_type=False), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('citations', postgresql.JSONB),
        sa.Column('context_mode', postgresql.ENUM('full_book', 'selected_text', 'chapter', name='contextmode', create_type=False)),
        sa.Column('selected_text', sa.Text),
        sa.Column('model_used', sa.String(50)),
        sa.Column('tokens_used', sa.Integer),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_messages_created', 'messages', ['created_at'])

    # Create quizzes table
    op.create_table(
        'quizs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chapters.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('difficulty', sa.String(20), server_default='medium'),
        sa.Column('time_limit_minutes', sa.Integer),
        sa.Column('is_active', sa.Boolean, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Create quiz_questions table
    op.create_table(
        'quizquestions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('quiz_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('quizs.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('question_type', postgresql.ENUM('multiple_choice', 'true_false', 'short_answer', name='questiontype', create_type=False), nullable=False),
        sa.Column('question_text', sa.Text, nullable=False),
        sa.Column('options', postgresql.JSONB),
        sa.Column('correct_answer', sa.Text, nullable=False),
        sa.Column('explanation', sa.Text),
        sa.Column('points', sa.Integer, server_default='1'),
        sa.Column('order_index', sa.Integer, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Create quiz_attempts table
    op.create_table(
        'quizattempts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('quiz_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('quizs.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('answers', postgresql.JSONB, nullable=False),
        sa.Column('score', sa.Float),
        sa.Column('max_score', sa.Float),
        sa.Column('percentage', sa.Float),
        sa.Column('time_taken_seconds', sa.Integer),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Create flashcard_decks table
    op.create_table(
        'flashcarddecks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chapters.id', ondelete='SET NULL'), index=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('card_count', sa.Integer, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Create flashcards table
    op.create_table(
        'flashcards',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('deck_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('flashcarddecks.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('front', sa.Text, nullable=False),
        sa.Column('back', sa.Text, nullable=False),
        sa.Column('hint', sa.Text),
        sa.Column('tags', postgresql.JSONB, server_default='[]'),
        sa.Column('easiness_factor', sa.Float, server_default='2.5'),
        sa.Column('interval_days', sa.Integer, server_default='1'),
        sa.Column('repetitions', sa.Integer, server_default='0'),
        sa.Column('next_review_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_flashcards_next_review', 'flashcards', ['next_review_at'])

    # Create flashcard_reviews table
    op.create_table(
        'flashcardreviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('flashcard_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('flashcards.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('quality', sa.Integer, nullable=False),
        sa.Column('response_time_ms', sa.Integer),
        sa.Column('easiness_factor_before', sa.Float),
        sa.Column('easiness_factor_after', sa.Float),
        sa.Column('interval_before', sa.Integer),
        sa.Column('interval_after', sa.Integer),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Create translated_content table
    op.create_table(
        'translatedcontents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chapters.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('language', sa.String(10), nullable=False),
        sa.Column('content_markdown', sa.Text, nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'in_progress', 'completed', 'failed', name='translationstatus', create_type=False), server_default='pending'),
        sa.Column('model_used', sa.String(50)),
        sa.Column('generation_time_seconds', sa.Float),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('chapter_id', 'language', name='uq_translated_chapter_language'),
    )

    # Create personalized_content table
    op.create_table(
        'personalizedcontents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chapters.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('interests', sa.Text, nullable=False),
        sa.Column('background_snapshot', postgresql.JSONB),
        sa.Column('content_markdown', sa.Text, nullable=False),
        sa.Column('model_used', sa.String(50)),
        sa.Column('generation_time_seconds', sa.Float),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('user_id', 'chapter_id', 'interests', name='uq_personalized_user_chapter_interests'),
    )

    # Create code_executions table (T057)
    op.create_table(
        'codeexecutions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chapters.id', ondelete='SET NULL'), index=True),
        sa.Column('code_block_id', sa.String(100)),
        sa.Column('language', sa.String(20), nullable=False),
        sa.Column('original_code', sa.Text, nullable=False),
        sa.Column('executed_code', sa.Text, nullable=False),
        sa.Column('output', sa.Text),
        sa.Column('error', sa.Text),
        sa.Column('execution_time_ms', sa.Integer),
        sa.Column('success', sa.Boolean, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )


def downgrade() -> None:
    # Drop tables in reverse order of creation
    op.drop_table('codeexecutions')
    op.drop_table('personalizedcontents')
    op.drop_table('translatedcontents')
    op.drop_table('flashcardreviews')
    op.drop_table('flashcards')
    op.drop_table('flashcarddecks')
    op.drop_table('quizattempts')
    op.drop_table('quizquestions')
    op.drop_table('quizs')
    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('readingprogress')
    op.drop_table('contentchunks')
    op.drop_table('chapters')
    op.drop_table('sessions')
    op.drop_table('users')

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS translationstatus")
    op.execute("DROP TYPE IF EXISTS questiontype")
    op.execute("DROP TYPE IF EXISTS contextmode")
    op.execute("DROP TYPE IF EXISTS messagerole")
    op.execute("DROP TYPE IF EXISTS chapterstatus")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS experiencelevel")
    op.execute("DROP TYPE IF EXISTS backgroundtype")
